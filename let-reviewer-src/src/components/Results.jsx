import React, { useEffect, useState, useRef } from 'react';
import { updateUserXP, recordUserActivity, recordQuestionStats } from '../services/db';

export default function Results({ questions, answers, time, user, onBack, onCompleteUpdate }) {
  const [xpEarned, setXpEarned] = useState(0);
  const [newStreak, setNewStreak] = useState(user?.streak || 0);
  const updatedRef = useRef(false);

  const correctAnswersCount = questions.reduce((acc, q) => {
    return acc + (answers[q.id] === q.correctAnswer ? 1 : 0);
  }, 0);

  useEffect(() => {
    if (!updatedRef.current && user) {
      updatedRef.current = true;
      const earned = correctAnswersCount * 10; // 10 XP per correct answer
      setXpEarned(earned);

      // Update XP
      updateUserXP(user.uid, earned).then(newXp => {
        if (onCompleteUpdate) {
          onCompleteUpdate(newXp);
        }
      });

      // Record global question stats (timesAttempted, timesCorrectFirstTry)
      recordQuestionStats(answers, questions).catch(err =>
        console.error("Failed to record question stats:", err)
      );

      // Record user activity (streak, hidden analytics)
      const timeSpent = time || 0;
      recordUserActivity(user.uid, questions.length, timeSpent).then(streak => {
        if (streak !== undefined) setNewStreak(streak);
      }).catch(err =>
        console.error("Failed to record user activity:", err)
      );
    }
  }, [correctAnswersCount, user, onCompleteUpdate, answers, questions, time]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title" style={{color: 'var(--color-primary)'}}>Quiz Results</h2>
          <p className="subtitle bold">You scored {correctAnswersCount} out of {questions.length}</p>
          {time !== undefined && (
            <p className="subtitle bold text-primary" style={{marginTop: '0.25rem'}}>⏱️ Completion Time: {formatTime(time)}</p>
          )}
        </div>
        <button onClick={onBack} className="btn-light btn-small">Back to Dashboard</button>
      </header>

      <div className="paper-card" style={{ textAlign: 'center', marginBottom: '2.5rem', background: 'var(--color-cat-green-bg)', border: 'none' }}>
        <h3 className="text-success" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>+{xpEarned} XP Earned!</h3>
        <p style={{color: 'var(--color-text-main)', fontWeight: 600, fontSize: '1.1rem'}}>Keep up the great work.</p>
      </div>

      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Review Answers</h3>

      {questions.map((q, index) => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;

        return (
          <div key={q.id} className="paper-card" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              {index + 1}. {q.questionText}
            </h4>
            
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {Object.entries(q.choices).map(([key, text]) => {
                let bgStyle = "var(--color-surface)";
                let borderColor = "var(--color-border)";
                let icon = "";
                let textColor = "var(--color-text-main)";

                if (key === q.correctAnswer) {
                  bgStyle = "var(--color-success-light)";
                  borderColor = "rgba(16, 185, 129, 0.4)";
                  icon = "✓";
                  textColor = "var(--color-success)";
                } else if (key === userAnswer && !isCorrect) {
                  bgStyle = "var(--color-error-light)";
                  borderColor = "rgba(239, 68, 68, 0.4)";
                  icon = "✗";
                  textColor = "var(--color-error)";
                }

                return (
                  <div key={key} style={{ 
                    padding: '1rem 1.25rem', 
                    borderRadius: '10px', 
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <strong style={{ minWidth: '24px', color: textColor, fontSize: '1.1rem' }}>{key}</strong>
                    <span style={{ flex: 1, fontWeight: 500, color: (key === q.correctAnswer || (key === userAnswer && !isCorrect)) ? textColor : 'inherit' }}>{text}</span>
                    {icon && <strong style={{ color: textColor, fontSize: '1.2rem' }}>{icon}</strong>}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', borderLeft: '4px solid var(--color-primary)' }}>
                <strong style={{color: 'var(--color-text-main)'}}>Explanation:</strong>
                <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
      
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button onClick={onBack} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
