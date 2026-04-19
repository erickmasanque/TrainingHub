import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function QuestionValidator() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const runValidation = async () => {
    setLoading(true);
    setIssues([]);

    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const allQuestions = [];
      snapshot.forEach(d => allQuestions.push({ id: d.id, ...d.data() }));
      setTotalQuestions(allQuestions.length);

      const found = [];

      allQuestions.forEach(q => {
        const questionIssues = [];

        // Check 1: Missing question text
        if (!q.questionText || q.questionText.trim() === '') {
          questionIssues.push('Missing question text');
        }

        // Check 2: Missing or invalid choices
        const choices = q.choices || {};
        const choiceKeys = ['A', 'B', 'C', 'D'];
        choiceKeys.forEach(key => {
          if (!choices[key] || choices[key].trim() === '') {
            questionIssues.push(`Missing choice ${key}`);
          }
        });

        // Check 3: Duplicate choices
        const choiceValues = choiceKeys.map(k => (choices[k] || '').trim().toLowerCase()).filter(v => v);
        const uniqueChoices = new Set(choiceValues);
        if (uniqueChoices.size < choiceValues.length) {
          const dupes = choiceValues.filter((v, i) => choiceValues.indexOf(v) !== i);
          questionIssues.push(`Duplicate choices found: "${dupes[0]}"`);
        }

        // Check 4: Invalid correct answer
        if (!q.correctAnswer || !choiceKeys.includes(q.correctAnswer.trim().toUpperCase())) {
          questionIssues.push(`Invalid correct answer: "${q.correctAnswer}"`);
        }

        // Check 5: Correct answer points to empty choice
        if (q.correctAnswer && (!choices[q.correctAnswer] || choices[q.correctAnswer].trim() === '')) {
          questionIssues.push(`Correct answer "${q.correctAnswer}" has no text`);
        }

        // Check 6: Missing cluster
        if (!q.cluster || q.cluster.trim() === '') {
          questionIssues.push('Missing cluster/subject');
        }

        // Check 7: Invalid Bloom's level
        const validBlooms = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        if (q.bloomsLevel) {
          const normalized = q.bloomsLevel.trim().charAt(0).toUpperCase() + q.bloomsLevel.trim().slice(1).toLowerCase();
          if (!validBlooms.includes(normalized)) {
            questionIssues.push(`Invalid Bloom's level: "${q.bloomsLevel}"`);
          }
        }

        if (questionIssues.length > 0) {
          found.push({
            id: q.id,
            questionText: q.questionText || '(no text)',
            choices: q.choices,
            correctAnswer: q.correctAnswer,
            cluster: q.cluster,
            issues: questionIssues
          });
        }
      });

      // Check 8: Duplicate questions (cross-question check)
      const textMap = {};
      allQuestions.forEach(q => {
        const normalizedText = (q.questionText || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalizedText) return;
        if (!textMap[normalizedText]) {
          textMap[normalizedText] = [];
        }
        textMap[normalizedText].push(q);
      });

      Object.entries(textMap).forEach(([text, dupes]) => {
        if (dupes.length > 1) {
          dupes.forEach(q => {
            // Check if already in found[]
            const existing = found.find(f => f.id === q.id);
            const dupeMsg = `Duplicate question (${dupes.length} copies exist)`;
            if (existing) {
              if (!existing.issues.includes(dupeMsg)) {
                existing.issues.push(dupeMsg);
                existing.duplicateIds = dupes.filter(d => d.id !== q.id).map(d => d.id);
              }
            } else {
              found.push({
                id: q.id,
                questionText: q.questionText || '(no text)',
                choices: q.choices,
                correctAnswer: q.correctAnswer,
                cluster: q.cluster,
                issues: [dupeMsg],
                duplicateIds: dupes.filter(d => d.id !== q.id).map(d => d.id)
              });
            }
          });
        }
      });

      setIssues(found);
      setScanned(true);
    } catch (err) {
      console.error("Validation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await deleteDoc(doc(db, "questions", id));
      setIssues(prev => prev.filter(i => i.id !== id));
      setTotalQuestions(prev => prev - 1);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Delete all duplicates of a question (keeps the current one, deletes the others)
  const handleDeleteDuplicates = async (keepId, duplicateIds) => {
    if (!duplicateIds || duplicateIds.length === 0) return;
    if (!window.confirm(`Delete ${duplicateIds.length} duplicate(s) and keep this one?`)) return;
    try {
      for (const dupeId of duplicateIds) {
        await deleteDoc(doc(db, "questions", dupeId));
        setTotalQuestions(prev => prev - 1);
      }
      // Remove the deleted duplicates from the issues list
      setIssues(prev => prev.filter(i => !duplicateIds.includes(i.id)));
      // Remove the duplicate issue tag from the kept question
      setIssues(prev => prev.map(i => {
        if (i.id === keepId) {
          const newIssues = i.issues.filter(iss => !iss.startsWith('Duplicate question'));
          if (newIssues.length === 0) return null; // No more issues
          return { ...i, issues: newIssues, duplicateIds: [] };
        }
        return i;
      }).filter(Boolean));
    } catch (err) {
      console.error("Delete duplicates failed:", err);
    }
  };

  // Delete ALL duplicate questions globally — keeps 1 of each, deletes the rest
  const handleDeleteAllDuplicates = async () => {
    // Collect all unique duplicate IDs to delete (avoid deleting same ID twice)
    const allIdsToDelete = new Set();
    const processed = new Set();

    issues.forEach(item => {
      if (!item.duplicateIds || item.duplicateIds.length === 0) return;
      if (processed.has(item.id)) return; // Already handled this group

      // Keep this item, mark its duplicates for deletion
      item.duplicateIds.forEach(dupeId => {
        if (!processed.has(dupeId)) {
          allIdsToDelete.add(dupeId);
        }
      });
      processed.add(item.id);
      item.duplicateIds.forEach(id => processed.add(id));
    });

    if (allIdsToDelete.size === 0) return;
    if (!window.confirm(`Delete ${allIdsToDelete.size} duplicate question(s)? This keeps 1 copy of each.`)) return;

    try {
      for (const id of allIdsToDelete) {
        await deleteDoc(doc(db, "questions", id));
        setTotalQuestions(prev => prev - 1);
      }
      // Remove deleted from issues, clean up remaining
      setIssues(prev => prev
        .filter(i => !allIdsToDelete.has(i.id))
        .map(i => {
          if (i.duplicateIds && i.duplicateIds.length > 0) {
            const newIssues = i.issues.filter(iss => !iss.startsWith('Duplicate question'));
            if (newIssues.length === 0) return null;
            return { ...i, issues: newIssues, duplicateIds: [] };
          }
          return i;
        }).filter(Boolean)
      );
    } catch (err) {
      console.error("Delete all duplicates failed:", err);
    }
  };

  return (
    <div className="paper-card" style={{ marginTop: '1rem', border: '1px solid var(--color-error)', borderRadius: '12px' }}>
      <h3 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>🔍 Question Validator</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Scans all questions for: duplicate questions, duplicate choices, missing text, invalid answers, and bad Bloom's levels.
      </p>

      <button
        className="btn-primary"
        onClick={runValidation}
        disabled={loading}
        style={{ marginBottom: '1rem' }}
      >
        {loading ? 'Scanning...' : 'Run Validation'}
      </button>

      {scanned && (
        <div>
          <p style={{ fontWeight: 700, marginBottom: '1rem' }}>
            Scanned {totalQuestions} questions — 
            <span style={{ color: issues.length === 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {issues.length === 0 ? ' ✅ All clean!' : ` ⚠️ ${issues.length} issues found`}
            </span>
          </p>

          {/* Global delete all duplicates button */}
          {issues.some(i => i.duplicateIds && i.duplicateIds.length > 0) && (
            <button
              className="btn-primary"
              style={{ marginBottom: '1rem', background: '#92400E', borderColor: '#92400E' }}
              onClick={handleDeleteAllDuplicates}
            >
              🧹 Delete ALL Duplicates (keep 1 of each)
            </button>
          )}

          {issues.map(item => (
            <div key={item.id} className="validator-issue-card">
              <div className="validator-issue-header">
                <strong className="validator-question-preview">
                  {item.questionText.substring(0, 80)}{item.questionText.length > 80 ? '...' : ''}
                </strong>
                <button className="btn-danger-small" onClick={() => handleDelete(item.id)}>
                  🗑️ Delete
                </button>
              </div>
              
              <div className="validator-issue-details">
                <span className="validator-cluster-tag">{item.cluster}</span>
                <span className="validator-id">ID: {item.id.substring(0, 8)}...</span>
              </div>

              {item.choices && (
                <div className="validator-choices">
                  {['A', 'B', 'C', 'D'].map(key => (
                    <span key={key} className={`validator-choice ${key === item.correctAnswer ? 'correct' : ''}`}>
                      <strong>{key}:</strong> {item.choices[key] || '(empty)'}
                    </span>
                  ))}
                </div>
              )}

              <ul className="validator-issue-list">
                {item.issues.map((issue, i) => (
                  <li key={i} className="validator-issue-item">⚠️ {issue}</li>
                ))}
              </ul>

              {item.duplicateIds && item.duplicateIds.length > 0 && (
                <button
                  className="btn-danger-small"
                  style={{ marginTop: '0.5rem', background: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' }}
                  onClick={() => handleDeleteDuplicates(item.id, item.duplicateIds)}
                >
                  ✅ Keep This &amp; Delete {item.duplicateIds.length} Duplicate(s)
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
