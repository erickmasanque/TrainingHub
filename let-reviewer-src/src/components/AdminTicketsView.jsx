import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getXPLeaderboard, getLeaderboard } from '../services/db';

export default function AdminTicketsView() {
  const [loading, setLoading] = useState(false);
  const [usersPoints, setUsersPoints] = useState([]);
  const [showView, setShowView] = useState(false);

  const calculateTickets = async () => {
    setLoading(true);
    try {
      // 1. Fetch all users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersMap = {};
      usersSnap.forEach(d => {
        const data = d.data();
        usersMap[data.uid] = { 
          uid: data.uid, 
          name: data.nickname || data.name || 'Unknown', 
          email: data.email || 'N/A', 
          points: 0 
        };
      });

      // 2. Overall XP Top 10
      const xpLb = await getXPLeaderboard(10);
      xpLb.forEach(e => { if (usersMap[e.uid]) usersMap[e.uid].points += 1; });

      // 3. Mock Exam Top 10
      const mockLb = await getLeaderboard('mock', 10, false, '');
      mockLb.forEach(e => { if (usersMap[e.uid]) usersMap[e.uid].points += 1; });

      // 4. Modes + Clusters Top 10
      const modes = ['survival', 'short', 'hard', 'sandbox'];
      const clusters = ['Intellectual Competencies', 'Personal & Civic Responsibilities', 'Practical Skills Development'];
      
      const promises = [];
      for (const mode of modes) {
        for (const cluster of clusters) {
          promises.push(getLeaderboard(mode, 10, false, cluster));
        }
      }
      const allLbs = await Promise.all(promises);
      for (const lb of allLbs) {
        lb.forEach(e => { if (usersMap[e.uid]) usersMap[e.uid].points += 1; });
      }

      // 5. Daily Leaderboards
      const qDaily = query(collection(db, 'leaderboard'), where('mode', '==', 'daily'));
      const dailySnap = await getDocs(qDaily);
      const dailyEntriesByDate = {};
      
      dailySnap.forEach(d => {
        const data = d.data();
        if (!dailyEntriesByDate[data.date]) dailyEntriesByDate[data.date] = [];
        dailyEntriesByDate[data.date].push(data);
      });

      for (const date in dailyEntriesByDate) {
        const dayEntries = dailyEntriesByDate[date];
        dayEntries.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if ((b.correctAnswers || 0) !== (a.correctAnswers || 0)) {
            return (b.correctAnswers || 0) - (a.correctAnswers || 0);
          }
          if ((a.timeSpentSeconds || 0) !== (b.timeSpentSeconds || 0)) {
            return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
          }
          return (a.submittedAt || '').localeCompare(b.submittedAt || '');
        });

        for (let i = 0; i < dayEntries.length; i++) {
          const e = dayEntries[i];
          if (usersMap[e.uid]) {
            if (i < 10) usersMap[e.uid].points += 1; // Top 10
            if (i < 3) usersMap[e.uid].points += 1;  // Top 3 gets another point
          }
        }
      }

      // Convert map to array and sort by points descending
      const sortedUsers = Object.values(usersMap).sort((a, b) => b.points - a.points);
      setUsersPoints(sortedUsers);
    } catch (error) {
      console.error('Error calculating tickets:', error);
      alert('Error calculating tickets. See console.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!showView) {
      calculateTickets();
    }
    setShowView(!showView);
  };

  return (
    <div className="paper-card" style={{ marginTop: '2rem', border: '1px dashed #d97706' }}>
      <h3 style={{ color: '#d97706' }}>Admin: Raffle Tickets View</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        View the current number of raffle tickets (points) for all users.
      </p>
      
      <button 
        className="btn-primary" 
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? 'Calculating...' : showView ? 'Hide Tickets View' : '🎟️ Show Tickets View'}
      </button>

      {showView && !loading && (
        <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '0.5rem' }}>Rank</th>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Email</th>
                <th style={{ padding: '0.5rem' }}>Tickets</th>
              </tr>
            </thead>
            <tbody>
              {usersPoints.map((user, index) => (
                <tr key={user.uid} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>#{index + 1}</td>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{user.name}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#666' }}>{user.email}</td>
                  <td style={{ padding: '0.5rem', color: '#d97706', fontWeight: 'bold' }}>{user.tickets || user.points}</td>
                </tr>
              ))}
              {usersPoints.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
