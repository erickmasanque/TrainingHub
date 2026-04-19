import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Quiz from './Quiz';
import QuizSurvival from './QuizSurvival';
import QuizSandbox from './QuizSandbox';
import Results from './Results';
import Seeder from './Seeder';
import MockExamSetup from './MockExamSetup';
import ModeSelector from './ModeSelector';
import AttemptHistory from './AttemptHistory';
import Leaderboard from './Leaderboard';
import MiniLeaderboard from './MiniLeaderboard';
import { getLevel, getLevelProgress, xpToNextLevel } from '../services/levels';
import { hasDoneDailyChallenge } from '../services/db';

export default function Dashboard({ user, setUser }) {
  const [activeCluster, setActiveCluster] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [mockExamSetup, setMockExamSetup] = useState(false);
  const [mockLimit, setMockLimit] = useState(75);
  const [isMockActive, setIsMockActive] = useState(false);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [modeSelector, setModeSelector] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [dailyResult, setDailyResult] = useState(undefined); // undefined=loading, null=not done, object=done

  // Check if daily challenge already completed today
  useEffect(() => {
    if (user?.uid) {
      hasDoneDailyChallenge(user.uid).then(result => {
        setDailyResult(result);
      }).catch(() => setDailyResult(null));
    }
  }, [user?.uid]);

  const resetAll = () => {
    setQuizResults(null);
    setActiveCluster(null);
    setIsMockActive(false);
    setIsDailyChallenge(false);
    setModeSelector(null);
    setActiveMode(null);
  };

  const getCurrentModeLabel = () => {
    if (isDailyChallenge) return 'daily';
    if (isMockActive) return 'mock';
    if (activeMode) return activeMode;
    return 'practice';
  };

  // Computed level info
  const currentXp = user.xp || 0;
  const level = getLevel(currentXp);
  const levelProgress = getLevelProgress(currentXp);
  const xpNeeded = xpToNextLevel(currentXp);

  // Results screen
  if (quizResults) {
    return <Results
      questions={quizResults.questions}
      answers={quizResults.answers}
      time={quizResults.time}
      user={user}
      onBack={resetAll}
      onCompleteUpdate={(newXp) => setUser({ ...user, xp: newXp })}
      mode={quizResults.mode}
      cluster={quizResults.cluster}
    />;
  }

  // History screen
  if (showHistory) {
    return <AttemptHistory user={user} onBack={() => setShowHistory(false)} />;
  }

  // Leaderboard screen
  if (showLeaderboard) {
    return <Leaderboard user={user} onBack={() => setShowLeaderboard(false)} />;
  }

  // Survival mode
  if (activeMode === 'survival' && activeCluster) {
    return <QuizSurvival
      cluster={activeCluster}
      onBack={resetAll}
      onComplete={(qs, ans, time) => setQuizResults({
        questions: qs, answers: ans, time,
        mode: 'survival', cluster: activeCluster
      })}
      userId={user.uid}
    />;
  }

  // Sandbox mode
  if (activeMode === 'sandbox' && activeCluster) {
    return <QuizSandbox
      cluster={activeCluster}
      onBack={resetAll}
      onComplete={(qs, ans, time) => setQuizResults({
        questions: qs, answers: ans, time,
        mode: 'sandbox', cluster: activeCluster
      })}
      userId={user.uid}
    />;
  }

  // Standard Quiz
  if (activeCluster) {
    let itemCount = 20;
    let isHardMode = false;
    let timedMinutes = null;

    if (isDailyChallenge) {
      itemCount = 7;
    } else if (isMockActive) {
      itemCount = mockLimit;
    } else if (activeMode === 'short') {
      itemCount = 7;
      timedMinutes = 3;
    } else if (activeMode === 'hard') {
      itemCount = 20;
      isHardMode = true;
    }

    return <Quiz
      cluster={isDailyChallenge ? "Global Daily Challenge" : activeCluster}
      onBack={resetAll}
      onComplete={(qs, ans, time) => setQuizResults({
        questions: qs, answers: ans, time,
        mode: getCurrentModeLabel(), cluster: activeCluster
      })}
      itemCount={itemCount}
      isMock={isMockActive}
      isDailyChallenge={isDailyChallenge}
      isHardMode={isHardMode}
      timedMinutes={timedMinutes}
      userId={user.uid}
    />;
  }

  // Mock exam setup
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

  // Mode selector
  if (modeSelector) {
    return <ModeSelector
      cluster={modeSelector}
      onCancel={() => setModeSelector(null)}
      onSelect={(mode) => {
        setActiveMode(mode);
        setActiveCluster(modeSelector);
        setModeSelector(null);
      }}
    />;
  }

  // ── MAIN DASHBOARD ──
  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1 className="app-title">Hello, {user.nickname || (user.name ? user.name.split(' ')[0] : 'Reviewer')}!</h1>
          <p className="subtitle bold">LET Reviewer</p>
        </div>
        <button onClick={() => signOut(auth)} className="btn-light btn-small">Logout</button>
      </header>

      {/* XP / Level Card */}
      <div className="flex-gap-1 mb-4">
        <div className="paper-card flex-1 p-4">
          <div className="level-header">
            <div>
              <div className="stat-label"><span className="text-warning">⭐</span> Total XP</div>
              <div className="stat-value">{currentXp.toLocaleString()} XP</div>
            </div>
            <div className="level-badge">
              <span className="level-badge-label">Level</span>
              <span className="level-badge-num">{level}</span>
            </div>
          </div>
          <div className="progress-bg" style={{ height: '10px', marginTop: '0.75rem' }}>
            <div className="progress-fill" style={{ width: `${levelProgress}%` }}></div>
          </div>
          <p className="level-progress-text">{levelProgress}/100 XP to Level {level + 1} • {xpNeeded} XP needed</p>
        </div>

        <div className="paper-card hoverable flex-1 p-4">
          <div className="stat-label">
            <span className="text-error">🔥</span> Streak
          </div>
          <div className="stat-value">{user.streak || 0} Days</div>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="challenge-card">
        <h3>Daily Challenge</h3>
        {dailyResult ? (
          <>
            <p className="text-success bold" style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ Completed Today!</p>
            <p>You scored <strong>{dailyResult.score}%</strong> ({dailyResult.correctAnswers}/{dailyResult.totalQuestions}) in {Math.floor((dailyResult.timeSpentSeconds || 0) / 60)}m {(dailyResult.timeSpentSeconds || 0) % 60}s</p>
          </>
        ) : (
          <>
            <p>7 global speedrun questions. Same for everyone today!</p>
            <button className="btn-light" onClick={() => {
              setIsDailyChallenge(true);
              setActiveCluster('General Education');
            }} disabled={dailyResult === undefined}>{
              dailyResult === undefined ? 'Checking...' : 'Start Speedrun'
            }</button>
          </>
        )}
      </div>

      {/* Daily Leaderboard mini widget */}
      <MiniLeaderboard mode="daily" title="🌍 Today's Daily Challenge Top 3" todayOnly={true} />

      {/* Mock Exam Leaderboard mini widget */}
      <MiniLeaderboard mode="mock" title="🏆 Mock Exam All-Time Top 3" todayOnly={false} />

      {/* Review Categories */}
      <div className="mb-4">
        <h2 className="section-title">Review Categories</h2>
        <div className="grid-cols-2">

          <div className="cat-card bg-cat-blue" onClick={() => setModeSelector('Intellectual Competencies')}>
            <div className="cat-icon-container icon-cat-blue">🧠</div>
            <h4 className="cat-title">Intellectual Competencies</h4>
          </div>

          <div className="cat-card bg-cat-pink" onClick={() => setModeSelector('Personal & Civic Responsibilities')}>
            <div className="cat-icon-container icon-cat-pink">🏛️</div>
            <h4 className="cat-title">Personal & Civic Responsibilities</h4>
          </div>

          <div className="cat-card bg-cat-green" onClick={() => setModeSelector('Practical Skills Development')}>
            <div className="cat-icon-container icon-cat-green">🛠️</div>
            <h4 className="cat-title">Practical Skills Development</h4>
          </div>

          <div className="cat-card bg-cat-purple" onClick={() => setMockExamSetup(true)}>
            <div className="cat-icon-container icon-cat-purple">🏆</div>
            <h4 className="cat-title">Mock Exam</h4>
          </div>

        </div>
      </div>

      {/* Bottom nav cards */}
      <div className="flex-gap-1 mb-4">
        <div className="paper-card hoverable flex-1" onClick={() => setShowHistory(true)} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Attempt History</h4>
        </div>
        <div className="paper-card hoverable flex-1" onClick={() => setShowLeaderboard(true)} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🏆</div>
          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Leaderboard</h4>
        </div>
      </div>

      {user.email === 'erickmasanque@gmail.com' && <Seeder />}
    </div>
  );
}
