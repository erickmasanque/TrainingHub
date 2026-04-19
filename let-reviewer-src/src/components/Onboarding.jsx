import React, { useState } from 'react';
import { updateUserNickname } from '../services/db';

export default function Onboarding({ user, onComplete }) {
  const [nickname, setNickname] = useState(user.name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    setLoading(true);
    try {
      await updateUserNickname(user.uid, nickname.trim());
      onComplete({ ...user, nickname: nickname.trim() });
    } catch (error) {
      console.error("Failed to update nickname:", error);
      setLoading(false);
    }
  };

  return (
    <div className="container center-container">
      <div className="paper-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
        <h2 className="section-title text-center">Welcome to LET Reviewer!</h2>
        <p className="subtitle text-center mb-4">What should we call you on the leaderboard?</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-4"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid var(--color-border)',
                fontSize: '1.1rem',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your nickname..."
              maxLength={20}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary btn-full"
            disabled={loading || !nickname.trim()}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
