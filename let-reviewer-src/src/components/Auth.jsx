import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

export default function Auth({ onLogin }) {
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (err) {
      console.error(err);
      setError("Failed to log in. Please check your Firebase config or connection.");
    }
  };

  return (
    <div className="auth-container">
      <div className="paper-card">
        <h2 className="auth-title">LET Reviewer</h2>
        <p className="auth-subtitle">Gamified preparation for BEED & BSED</p>
        
        {error && <p style={{color: 'var(--color-correction-red)', marginBottom: '1rem'}}>{error}</p>}
        
        <button onClick={handleGoogleLogin} className="google-btn">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
