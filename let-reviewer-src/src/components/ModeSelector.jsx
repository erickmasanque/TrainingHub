import React from 'react';

const MODES = [
  {
    id: 'short',
    icon: '⚡',
    title: 'Short Challenge',
    desc: '7 questions in 3 minutes. Quick and focused!',
    color: 'var(--color-cat-blue-bg)',
    border: 'var(--color-primary)'
  },
  {
    id: 'hard',
    icon: '🔥',
    title: 'Hard Challenge',
    desc: 'The toughest questions the community struggles with.',
    color: 'var(--color-cat-pink-bg)',
    border: 'var(--color-error)'
  },
  {
    id: 'survival',
    icon: '💀',
    title: 'Survival',
    desc: '30s per question. Earn extra lives at milestones!',
    color: 'var(--color-cat-purple-bg)',
    border: 'var(--color-accent)'
  },
  {
    id: 'sandbox',
    icon: '🏖️',
    title: 'Sandbox',
    desc: 'Practice at your pace. Missed questions come back for mastery.',
    color: 'var(--color-cat-green-bg)',
    border: 'var(--color-success)'
  }
];

export default function ModeSelector({ cluster, onSelect, onCancel }) {
  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">{cluster}</h2>
          <p className="subtitle bold">Choose your challenge mode</p>
        </div>
        <button onClick={onCancel} className="btn-light btn-small">Back</button>
      </header>

      <div className="mode-grid">
        {MODES.map(mode => (
          <div
            key={mode.id}
            className="mode-card"
            style={{
              backgroundColor: mode.color,
              borderLeft: `4px solid ${mode.border}`
            }}
            onClick={() => onSelect(mode.id)}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div className="mode-info">
              <h3 className="mode-title">{mode.title}</h3>
              <p className="mode-desc">{mode.desc}</p>
            </div>
            <div className="mode-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
