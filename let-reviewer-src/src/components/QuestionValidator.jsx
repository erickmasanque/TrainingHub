import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function QuestionValidator() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [allQuestions, setAllQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAllQuestions = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const loaded = [];
      snapshot.forEach(d => loaded.push({ id: d.id, ...d.data() }));
      setAllQuestions(loaded);
      setTotalQuestions(loaded.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setLoading(true);
    setIssues([]);

    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const loadedQuestions = [];
      snapshot.forEach(d => loadedQuestions.push({ id: d.id, ...d.data() }));
      setAllQuestions(loadedQuestions);
      setTotalQuestions(loadedQuestions.length);

      const found = [];

      loadedQuestions.forEach(q => {
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
            bloomsLevel: q.bloomsLevel,
            issues: questionIssues
          });
        }
      });

      // Check 8: Duplicate questions (cross-question check)
      const textMap = {};
      loadedQuestions.forEach(q => {
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
                bloomsLevel: q.bloomsLevel,
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

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditFormData({
      questionText: item.questionText || '',
      choices: { ...item.choices },
      correctAnswer: item.correctAnswer || '',
      cluster: item.cluster || '',
      bloomsLevel: item.bloomsLevel || '' // we need to add bloomsLevel to the issue item
    });
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChoiceChange = (key, value) => {
    setEditFormData(prev => ({
      ...prev,
      choices: { ...prev.choices, [key]: value }
    }));
  };

  const handleSaveEdit = async () => {
    try {
      await updateDoc(doc(db, "questions", editingId), {
        questionText: editFormData.questionText,
        choices: editFormData.choices,
        correctAnswer: editFormData.correctAnswer,
        cluster: editFormData.cluster,
        bloomsLevel: editFormData.bloomsLevel
      });
      
      // Update local states
      setAllQuestions(prev => prev.map(q => q.id === editingId ? { ...q, ...editFormData } : q));
      setIssues(prev => prev.map(q => q.id === editingId ? { ...q, ...editFormData } : q));
      
      setEditingId(null);
      alert("Question updated!");
    } catch (err) {
      console.error("Failed to update question:", err);
      alert("Failed to update question.");
    }
  };

  const handleAutoFixBlooms = async () => {
    if (!window.confirm("Auto-fix Bloom's levels? (e.g. 'Remembering' -> 'Remember')")) return;
    setLoading(true);
    const fixes = {
      'remembering': 'Remember', 'understanding': 'Understand', 'applying': 'Apply',
      'analyzing': 'Analyze', 'evaluating': 'Evaluate', 'creating': 'Create',
      'remember': 'Remember', 'understand': 'Understand', 'apply': 'Apply',
      'analyze': 'Analyze', 'evaluate': 'Evaluate', 'create': 'Create'
    };
    let fixedCount = 0;
    try {
      const snapshot = await getDocs(collection(db, "questions"));
      for (const d of snapshot.docs) {
        const data = d.data();
        if (data.bloomsLevel) {
          const lower = data.bloomsLevel.trim().toLowerCase();
          if (fixes[lower] && data.bloomsLevel !== fixes[lower]) {
            await updateDoc(doc(db, "questions", d.id), { bloomsLevel: fixes[lower] });
            fixedCount++;
          }
        }
      }
      alert(`Fixed ${fixedCount} questions!`);
      runValidation();
    } catch (err) {
      console.error(err);
      alert("Error fixing blooms");
    } finally {
      setLoading(false);
    }
  };

  const renderQuestionCard = (item) => {
    const isEditing = editingId === item.id;
    return (
      <div key={item.id} className="validator-issue-card">
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Question Text</label>
            <textarea 
              value={editFormData.questionText} 
              onChange={(e) => handleEditChange('questionText', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['A', 'B', 'C', 'D'].map(key => (
                <div key={key}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Choice {key}</label>
                  <input 
                    type="text"
                    value={editFormData.choices?.[key] || ''}
                    onChange={(e) => handleChoiceChange(key, e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Correct Answer</label>
                <select 
                  value={editFormData.correctAnswer} 
                  onChange={(e) => handleEditChange('correctAnswer', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Select...</option>
                  {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Cluster</label>
                <input 
                  type="text"
                  value={editFormData.cluster}
                  onChange={(e) => handleEditChange('cluster', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Bloom's Level</label>
                <input 
                  type="text"
                  value={editFormData.bloomsLevel}
                  onChange={(e) => handleEditChange('bloomsLevel', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn-primary" onClick={handleSaveEdit}>💾 Save</button>
              <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="validator-issue-header">
              <strong className="validator-question-preview">
                {item.questionText ? item.questionText.substring(0, 80) : '(no text)'}
                {item.questionText && item.questionText.length > 80 ? '...' : ''}
              </strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary-small" onClick={() => handleEditClick(item)}>
                  ✏️ Edit
                </button>
                <button className="btn-danger-small" onClick={() => handleDelete(item.id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
            
            <div className="validator-issue-details">
              <span className="validator-cluster-tag">{item.cluster || 'No Cluster'}</span>
              <span className="validator-id">ID: {item.id.substring(0, 8)}...</span>
              {item.bloomsLevel && <span className="validator-cluster-tag" style={{ background: '#E0E7FF', color: '#3730A3' }}>{item.bloomsLevel}</span>}
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

            {item.issues && item.issues.length > 0 && (
              <ul className="validator-issue-list">
                {item.issues.map((issue, i) => (
                  <li key={i} className="validator-issue-item">⚠️ {issue}</li>
                ))}
              </ul>
            )}

            {item.duplicateIds && item.duplicateIds.length > 0 && (
              <button
                className="btn-danger-small"
                style={{ marginTop: '0.5rem', background: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' }}
                onClick={() => handleDeleteDuplicates(item.id, item.duplicateIds)}
              >
                ✅ Keep This &amp; Delete {item.duplicateIds.length} Duplicate(s)
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const searchResults = searchTerm.length > 2 
    ? allQuestions.filter(q => q.questionText?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 20)
    : [];

  return (
    <div className="paper-card" style={{ marginTop: '1rem', border: '1px solid var(--color-error)', borderRadius: '12px' }}>
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Search &amp; Edit Any Question</h4>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Search your entire database to edit questions even if they have no errors.</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Type a keyword from the question (e.g. 'Rizal')..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
          {allQuestions.length === 0 && (
            <button className="btn-secondary" onClick={loadAllQuestions} disabled={loading}>
              {loading ? 'Loading...' : 'Load Database'}
            </button>
          )}
        </div>
        {searchTerm.length > 2 && (
          <div style={{ marginTop: '1rem' }}>
            {searchResults.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>No matching questions found.</p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 'bold', marginBottom: '0.5rem' }}>Found {searchResults.length} matches (showing up to 20):</p>
            )}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {searchResults.map(renderQuestionCard)}
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '2px solid #e5e7eb', margin: '1.5rem 0' }}></div>

      <h3 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>🔍 Validation Scanner</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Automatically scan all questions for: duplicates, missing text, invalid answers, and bad Bloom's levels.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className="btn-primary"
          onClick={runValidation}
          disabled={loading}
        >
          {loading ? 'Scanning...' : 'Run Full Validation'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleAutoFixBlooms}
          disabled={loading}
        >
          ✨ Auto-Fix Bloom's Levels
        </button>
      </div>

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

          {issues.map(renderQuestionCard)}
        </div>
      )}
    </div>
  );
}
