import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

export default function Landing({ onLogin }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for redirect result on page load (for mobile browsers that don't support popups)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          onLogin(result.user);
        }
      })
      .catch((err) => {
        // Handle the "missing initial state" error gracefully
        if (err.code === 'auth/missing-initial-state' || 
            err.message?.includes('missing initial state')) {
          console.warn('Redirect auth state lost. Please try again.');
          setError('Login session expired. Please tap the button to try again.');
        } else {
          console.error('Redirect result error:', err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      // Try popup first (works on most desktop browsers)
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (err) {
      // If popup is blocked or fails, fall back to redirect
      if (err.code === 'auth/popup-blocked' || 
          err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          // Page will redirect — result handled by getRedirectResult above
        } catch (redirectErr) {
          console.error('Redirect login failed:', redirectErr);
          setError('Login failed. Please clear your browser cache and try again.');
        }
      } else {
        console.error('Login error:', err);
        setError('Failed to log in. Please check your connection and try again.');
      }
    }
  };

  if (loading) {
    return <div className="container center-container">Checking login...</div>;
  }

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.05em', color: 'var(--color-primary)' }}>
          TrainingHub
        </h1>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--color-text-main)', letterSpacing: '-0.025em', lineHeight: '1.2' }}>
          Master the LET Exam.
        </h2>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '3.5rem', lineHeight: '1.6' }}>
          A modern, gamified review platform designed specifically for BEED and BSED students. Practice effectively, track your progress, and conquer your exams with confidence.
        </p>

        <div className="paper-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Get Started</h3>
          {error && <p className="text-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</p>}
          
          <button onClick={handleGoogleLogin} className="google-btn">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" />
            Continue with Google
          </button>
          
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Join thousands of future teachers reviewing smarter today.
          </p>

          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            💡 Having trouble? Open this link directly in Chrome or Safari, not inside Facebook/Instagram.
          </p>
        </div>
      </div>

    </div>
  );
}
