import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/db';
import { getLevel } from '../services/levels';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function MiniLeaderboard({ mode, title, todayOnly = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard(mode, 3, todayOnly);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load mini leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode, todayOnly]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className="mini-lb-card">
      <h4 className="mini-lb-title">{title}</h4>
      {entries.map((entry, index) => {
        const level = getLevel(entry.xp);
        return (
          <div key={entry.id || index} className="mini-lb-row">
            <span className="mini-lb-medal">{MEDAL[index]}</span>
            <span className="mini-lb-name">{entry.nickname || 'Anonymous'}</span>
            <span className="mini-lb-level">Lv.{level}</span>
            <span className="mini-lb-score">{entry.score}%</span>
          </div>
        );
      })}
    </div>
  );
}
