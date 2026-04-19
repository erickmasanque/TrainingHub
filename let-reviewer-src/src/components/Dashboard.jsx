import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Quiz from './Quiz';
import Results from './Results';
import Seeder from './Seeder';
import MockExamSetup from './MockExamSetup';

export default function Dashboard({ user, setUser }) {
  const [activeCluster, setActiveCluster] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [mockExamSetup, setMockExamSetup] = useState(false);
  const [mockLimit, setMockLimit] = useState(75);
  const [isMockActive, setIsMockActive] = useState(false);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);

  if (quizResults) {
    return <Results 
      questions={quizResults.questions} 
      answers={quizResults.answers} 
      time={quizResults.time}
      user={user} 
      onBack={() => {
        setQuizResults(null);
        setActiveCluster(null);
        setIsMockActive(false);
        setIsDailyChallenge(false);
      }}
      onCompleteUpdate={(newXp) => setUser({ ...user, xp: newXp })}
    />;
  }

  if (activeCluster) {
    return <Quiz 
      cluster={isDailyChallenge ? "Global Daily Challenge" : activeCluster} 
      onBack={() => {
        setActiveCluster(null);
        setIsMockActive(false);
        setIsDailyChallenge(false);
      }} 
      onComplete={(qs, ans, time) => setQuizResults({ questions: qs, answers: ans, time })}
      itemCount={isMockActive ? mockLimit : (isDailyChallenge ? 7 : 20)}
      isMock={isMockActive}
      isDailyChallenge={isDailyChallenge}
    />;
  }

  if (mockExamSetup) {
    return <MockExamSetup 
      onCancel={() => setMockExamSetup(false)} 
      onStart={(limit) => {
        setMockLimit(limit);
        setMockExamSetup(false);
        setIsMockActive(true);
        setActiveCluster('General Education');
      }} 
    />;
  }

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1 className="app-title">Hello, {user.nickname || (user.name ? user.name.split(' ')[0] : 'Reviewer')}!</h1>
          <p className="subtitle bold">LET Reviewer</p>
        </div>
        <button onClick={() => signOut(auth)} className="btn-light btn-small">Logout</button>
      </header>
      
      <div className="flex-gap-1 mb-4">
        <div className="paper-card hoverable flex-1 p-4">
          <div className="stat-label">
            <span className="text-warning">⭐</span> Total XP
          </div>
          <div className="stat-value">{user.xp}</div>
          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${Math.min(100, (user.xp % 100) || 10)}%` }}></div>
          </div>
        </div>
        
        <div className="paper-card hoverable flex-1 p-4">
          <div className="stat-label">
            <span className="text-error">🔥</span> Streak
          </div>
          <div className="stat-value">{user.streak} Days</div>
        </div>
      </div>

      <div className="challenge-card">
        <h3>Daily Challenge</h3>
        <p>7 global speedrun questions. Same for everyone today!</p>
        <button className="btn-light" onClick={() => {
          setIsDailyChallenge(true);
          setActiveCluster('General Education');
        }}>Start Speedrun</button>
      </div>

      <div className="mb-4">
        <h2 className="section-title">Review Categories</h2>
        <div className="grid-cols-2">
          
          <div className="cat-card bg-cat-blue" onClick={() => setActiveCluster('Intellectual Competencies')}>
            <div className="cat-icon-container icon-cat-blue">🧠</div>
            <h4 className="cat-title">Intellectual Competencies</h4>
          </div>
          
          <div className="cat-card bg-cat-pink" onClick={() => setActiveCluster('Personal & Civic Responsibilities')}>
            <div className="cat-icon-container icon-cat-pink">🏛️</div>
            <h4 className="cat-title">Personal & Civic Responsibilities</h4>
          </div>

          <div className="cat-card bg-cat-green" onClick={() => setActiveCluster('Practical Skills Development')}>
            <div className="cat-icon-container icon-cat-green">🛠️</div>
            <h4 className="cat-title">Practical Skills Development</h4>
          </div>
          
          <div className="cat-card bg-cat-purple" onClick={() => setMockExamSetup(true)}>
            <div className="cat-icon-container icon-cat-purple">🏆</div>
            <h4 className="cat-title">Mock Exam</h4>
          </div>

        </div>
      </div>
      {user.email === 'erickmasanque@gmail.com' && <Seeder />}
    </div>
  );
}
