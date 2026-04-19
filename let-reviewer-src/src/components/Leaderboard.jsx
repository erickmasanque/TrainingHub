import React, { useState, useEffect } from 'react';
import { getLeaderboard, getXPLeaderboard } from '../services/db';
import { getLevel } from '../services/levels';

const TABS = [
  { id: 'xp', label: '⭐ Overall XP', icon: '⭐', hasCategories: false },
  { id: 'daily', label: '🌍 Daily', icon: '🌍', hasCategories: false },
  { id: 'mock', label: '🏆 Mock Exam', icon: '🏆', hasCategories: false },
  { id: 'survival', label: '💀 Survival', icon: '💀', hasCategories: true },
  { id: 'short', label: '⚡ Short', icon: '⚡', hasCategories: true },
  { id: 'hard', label: '🔥 Hard', icon: '🔥', hasCategories: true },
  { id: 'sandbox', label: '🏖️ Sandbox', icon: '🏖️', hasCategories: true }
];

const CLUSTERS = [
  { id: '', label: 'All Categories' },
  { id: 'Intellectual Competencies', label: '🧠 Intellectual' },
  { id: 'Personal & Civic Responsibilities', label: '🏛️ Civic' },
  { id: 'Practical Skills Development', label: '🛠️ Practical' }
];

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('xp');
  const [activeCluster, setActiveCluster] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentTabConfig = TABS.find(t => t.id === activeTab);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let data;
        if (activeTab === 'xp') {
          data = await getXPLeaderboard(10);
          data = data.map(u => ({
            uid: u.uid,
            nickname: u.nickname || u.name || 'Anonymous',
            xp: u.xp || 0,
            score: null
          }));
        } else if (activeTab === 'daily') {
          data = await getLeaderboard('daily', 10, true, '');
        } else {
          data = await getLeaderboard(activeTab, 10, false, activeCluster);
        }
        setEntries(data);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeTab, activeCluster]);

  // Reset cluster filter when switching to a tab without categories
  useEffect(() => {
    if (currentTabConfig && !currentTabConfig.hasCategories) {
      setActiveCluster('');
    }
  }, [activeTab]);

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">🏆 Leaderboard</h2>
          <p className="subtitle bold">Top players across all modes</p>
        </div>
        <button onClick={onBack} className="btn-light btn-small">Back</button>
      </header>

      {/* Mode tabs */}
      <div className="lb-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`lb-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cluster sub-tabs (only for modes with categories) */}
      {currentTabConfig?.hasCategories && (
        <div className="lb-cluster-bar">
          {CLUSTERS.map(c => (
            <button
              key={c.id}
              className={`lb-cluster-btn ${activeCluster === c.id ? 'active' : ''}`}
              onClick={() => setActiveCluster(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="paper-card" style={{ textAlign: 'center' }}>
          <p>Loading leaderboard...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="paper-card" style={{ textAlign: 'center' }}>
          <p className="subtitle">No entries yet. Be the first! 🚀</p>
        </div>
      ) : (
        <div className="lb-list">
          {entries.map((entry, index) => {
            const isMe = entry.uid === user?.uid;
            const level = getLevel(entry.xp);
            return (
              <div key={entry.id || index} className={`lb-row ${isMe ? 'lb-row-me' : ''}`}>
                <div className="lb-rank">
                  {index < 3 ? (
                    <span className="lb-medal">{MEDAL[index]}</span>
                  ) : (
                    <span className="lb-rank-num">{index + 1}</span>
                  )}
                </div>
                <div className="lb-info">
                  <span className="lb-name">{entry.nickname || 'Anonymous'}</span>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span className="lb-level-tag">Lv.{level}</span>
                    {entry.cluster && (
                      <span className="lb-cluster-tag">{entry.cluster.split(' ')[0]}</span>
                    )}
                  </div>
                </div>
                <div className="lb-score-area">
                  {activeTab === 'xp' ? (
                    <span className="lb-score-value">{entry.xp?.toLocaleString()} XP</span>
                  ) : (
                    <>
                      <span className="lb-score-value">{entry.score}%</span>
                      <span className="lb-score-detail">
                        {entry.correctAnswers}/{entry.totalQuestions} • {formatTime(entry.timeSpentSeconds)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
