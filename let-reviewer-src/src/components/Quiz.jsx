import React, { useState, useEffect, useRef } from 'react';
import { getQuestionsByCluster, generateMockExam, getDailyChallengeQuestions, getHardestQuestions } from '../services/db';
import BubbleSheet from './BubbleSheet';
import ReportButton from './ReportButton';
import { playClick, playNext, playFinish, playTimerTick } from '../services/sounds';

export default function Quiz({ 
  cluster, onBack, onComplete, itemCount = 20, 
  isMock = false, isDailyChallenge = false,
  isHardMode = false, timedMinutes = null,
  userId = null
}) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const mockTimeLimit = isMock ? (itemCount === 150 ? 7200 : 3600) : null;
  const shortTimeLimit = timedMinutes ? timedMinutes * 60 : null;
  const initialTimeLimit = mockTimeLimit || shortTimeLimit;
  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        let q;
        if (isDailyChallenge) {
          q = await getDailyChallengeQuestions(itemCount);
        } else if (isMock) {
          q = await generateMockExam(itemCount);
        } else if (isHardMode) {
          q = await getHardestQuestions(cluster, itemCount);
          if (q.length < itemCount) {
            const extra = await getQuestionsByCluster(cluster);
            const extraShuffled = extra.sort(() => Math.random() - 0.5);
            const existingIds = new Set(q.map(x => x.id));
            for (const eq of extraShuffled) {
              if (!existingIds.has(eq.id)) {
                q.push(eq);
                if (q.length >= itemCount) break;
              }
            }
          }
        } else {
          q = await getQuestionsByCluster(cluster);
          q = q.sort(() => Math.random() - 0.5).slice(0, itemCount);
        }
        setQuestions(q);
      } catch (err) {
        console.error("Failed to load questions:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cluster, itemCount, isMock, isDailyChallenge, isHardMode]);

  // Timer logic
  useEffect(() => {
    if (loading || questions.length === 0) return;

    const timerId = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      if (initialTimeLimit !== null) {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) return 0;
          return prev !== null ? prev - 1 : null;
        });
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, questions.length]);

  // Auto-submit when countdown timer runs out
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && questions.length > 0) {
      onComplete(questions, answers, elapsedTime);
    }
  }, [timeLeft]);

  const handleNext = () => {
    if (!selectedAnswer) return;
    playClick();
    
    const newAnswers = { ...answers, [questions[currentIndex].id]: selectedAnswer };
    setAnswers(newAnswers);
    setSelectedAnswer('');

    if (currentIndex < questions.length - 1) {
      playNext();
      setCurrentIndex(currentIndex + 1);
    } else {
      playFinish();
      onComplete(questions, newAnswers, elapsedTime);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    if (isDailyChallenge) return 'Global Daily Challenge';
    if (isMock) return `Mock Exam: ${cluster}`;
    if (isHardMode) return `🔥 Hard Challenge: ${cluster}`;
    if (timedMinutes) return `⚡ Short Challenge: ${cluster}`;
    return cluster;
  };

  // Progress bar color logic
  const getTimerBarClass = () => {
    if (initialTimeLimit === null || timeLeft === null) return '';
    const percent = timeLeft / initialTimeLimit;
    if (percent <= 0.2) return 'timer-bar-red';
    if (percent <= 0.4) return 'timer-bar-orange';
    return 'timer-bar-green';
  };

  if (loading) return <div className="container" style={{textAlign: 'center'}}>Loading questions...</div>;
  if (questions.length === 0) return <div className="container">No questions found for {cluster}. <button onClick={onBack} className="btn-primary">Back</button></div>;

  const currentQ = questions[currentIndex];
  if (!currentQ) return <div className="container">Error loading question data! <button onClick={onBack} className="btn-primary">Back</button></div>;

  const hasCountdown = timeLeft !== null && initialTimeLimit !== null;
  const timerPercent = hasCountdown ? (timeLeft / initialTimeLimit) * 100 : 0;

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">{getModeLabel()}</h2>
          <p className="subtitle bold">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <div className="align-items-center">
          {hasCountdown && (
            <div className={`timer-badge ${timeLeft < 60 ? 'warning' : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}
          {isDailyChallenge && (
            <div className="timer-badge">
              ⏱️ {formatTime(elapsedTime)}
            </div>
          )}
          <button onClick={onBack} className="btn-light btn-small">Quit</button>
        </div>
      </header>

      {/* Countdown progress bar */}
      {hasCountdown && (
        <div className="countdown-bar-bg">
          <div
            className={`countdown-bar-fill ${getTimerBarClass()}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      <div className="paper-card">
        <h3 className="section-title">{currentQ.questionText}</h3>
        <BubbleSheet 
          options={currentQ.choices} 
          selected={selectedAnswer} 
          onSelect={setSelectedAnswer} 
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <ReportButton questionId={currentQ.id} uid={userId} />
          <button onClick={handleNext} className="btn-primary" disabled={!selectedAnswer}>
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
