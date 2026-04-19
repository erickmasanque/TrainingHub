import React, { useState, useEffect } from 'react';
import { getAttemptHistory } from '../services/db';

const MODE_LABELS = {
  practice: '📝 Practice',
  short: '⚡ Short Challenge',
  hard: '🔥 Hard Challenge',
  survival: '💀 Survival',
  sandbox: '🏖️ Sandbox',
  daily: '🌍 Daily Challenge',
  mock: '🏆 Mock Exam'
};

const MODE_COLORS = {
  practice: 'var(--color-border)',
  short: 'var(--color-primary)',
  hard: 'var(--color-error)',
  survival: 'var(--color-accent, #8B5CF6)',
  sandbox: 'var(--color-success)',
  daily: 'var(--color-primary-light)',
  mock: 'var(--color-accent, #8B5CF6)'
};

export default function AttemptHistory({ user, onBack }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or cluster/mode name
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAttemptHistory(user.uid);
        setAttempts(data);
      } catch (err) {
        console.error("Failed to load attempts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.uid]);

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', { 
      month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  };

  if (loading) return <div className="container" style={{ textAlign: 'center' }}>Loading history...</div>;

  // Compute stats
  const filtered = filter === 'all' 
    ? attempts 
    : attempts.filter(a => a.cluster === filter || a.mode === filter);

  const bestAttempt = filtered.length > 0 
    ? filtered.reduce((best, a) => a.score > best.score ? a : best, filtered[0]) 
    : null;

  // Group by cluster for category breakdown
  const clusterGroups = {};
  attempts.forEach(a => {
    const key = a.cluster || 'General';
    if (!clusterGroups[key]) clusterGroups[key] = [];
    clusterGroups[key].push(a);
  });

  // Unique clusters for filter buttons
  const uniqueClusters = ['all', ...Object.keys(clusterGroups)];

  const displayedAttempts = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">📊 Attempt History</h2>
          <p className="subtitle bold">{attempts.length} total attempts</p>
        </div>
        <button onClick={onBack} className="btn-light btn-small">Back</button>
      </header>

      {/* Overall Stats */}
      <div className="flex-gap-1 mb-4">
        <div className="paper-card flex-1 p-4" style={{ textAlign: 'center' }}>
          <div className="stat-label">Total Attempts</div>
          <div className="stat-value">{attempts.length}</div>
        </div>
        <div className="paper-card flex-1 p-4" style={{ textAlign: 'center' }}>
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">
            {attempts.length > 0 
              ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length) 
              : 0}%
          </div>
        </div>
        <div className="paper-card flex-1 p-4" style={{ textAlign: 'center' }}>
          <div className="stat-label">Total XP</div>
          <div className="stat-value">
            {attempts.reduce((s, a) => s + (a.xpEarned || 0), 0)}
          </div>
        </div>
      </div>

      {/* Best Attempt */}
      {bestAttempt && (
        <div className="paper-card history-best-card mb-4">
          <div className="history-best-badge">🏅 Best Attempt</div>
          <div className="history-best-content">
            <div>
              <span className="history-mode-tag" style={{ borderColor: MODE_COLORS[bestAttempt.mode] || 'var(--color-border)' }}>
                {MODE_LABELS[bestAttempt.mode] || bestAttempt.mode}
              </span>
              <span className="subtitle" style={{ marginLeft: '0.5rem' }}>{bestAttempt.cluster}</span>
            </div>
            <div className="history-best-score">{bestAttempt.score}%</div>
            <div className="subtitle">
              {bestAttempt.correctAnswers}/{bestAttempt.totalQuestions} correct • {formatTime(bestAttempt.timeSpentSeconds)} • {formatDate(bestAttempt.createdAt)}
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <h3 className="section-title">By Category</h3>
      <div className="history-category-grid mb-4">
        {Object.entries(clusterGroups).map(([cluster, items]) => {
          const avg = Math.round(items.reduce((s, a) => s + (a.score || 0), 0) / items.length);
          const best = Math.max(...items.map(a => a.score || 0));
          return (
            <div key={cluster} className="paper-card history-category-card" onClick={() => { setFilter(cluster); setShowAll(false); }}>
              <h4 className="history-category-name">{cluster}</h4>
              <div className="history-category-stats">
                <span>{items.length} attempts</span>
                <span>Avg: {avg}%</span>
                <span className="text-success">Best: {best}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <h3 className="section-title">All Attempts</h3>
      <div className="history-filter-tabs mb-4">
        {uniqueClusters.map(c => (
          <button
            key={c}
            className={`history-filter-btn ${filter === c ? 'active' : ''}`}
            onClick={() => { setFilter(c); setShowAll(false); }}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {/* Attempt List */}
      {filtered.length === 0 ? (
        <div className="paper-card" style={{ textAlign: 'center' }}>
          <p className="subtitle">No attempts yet for this filter.</p>
        </div>
      ) : (
        <>
          {displayedAttempts.map((attempt, i) => {
            const scoreColor = attempt.score >= 75 ? 'var(--color-success)' : 
                              attempt.score >= 50 ? 'var(--color-primary)' : 'var(--color-error)';
            return (
              <div key={attempt.id || i} className="history-attempt-row">
                <div className="history-attempt-left">
                  <span className="history-mode-tag" style={{ borderColor: MODE_COLORS[attempt.mode] || 'var(--color-border)' }}>
                    {MODE_LABELS[attempt.mode] || attempt.mode}
                  </span>
                  <div className="history-attempt-meta">
                    <span className="history-attempt-cluster">{attempt.cluster}</span>
                    <span className="history-attempt-date">{formatDateTime(attempt.createdAt)}</span>
                  </div>
                </div>
                <div className="history-attempt-right">
                  <span className="history-attempt-score" style={{ color: scoreColor }}>
                    {attempt.score}%
                  </span>
                  <span className="history-attempt-detail">
                    {attempt.correctAnswers}/{attempt.totalQuestions} • {formatTime(attempt.timeSpentSeconds)}
                  </span>
                </div>
              </div>
            );
          })}

          {filtered.length > 5 && !showAll && (
            <button className="btn-light btn-full" style={{ marginTop: '1rem' }} onClick={() => setShowAll(true)}>
              Show All ({filtered.length} attempts)
            </button>
          )}
        </>
      )}
    </div>
  );
}
