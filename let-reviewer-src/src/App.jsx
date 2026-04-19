import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './services/db';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const profile = await getUserProfile(authUser.uid, authUser.email, authUser.displayName);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="container center-container">Loading...</div>;

  const handleOnboardingComplete = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <BrowserRouter base="/TrainingHub/let-reviewer-web/">
      <Routes>
        <Route path="/" element={
          !user ? <Landing onLogin={(u) => { /* Let onAuthStateChanged handle it */ }} /> : 
          (!user.nickname ? <Onboarding user={user} onComplete={handleOnboardingComplete} /> :
          <Dashboard user={user} setUser={setUser} />)
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
