import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEndlessQuestions } from '../services/db';
import BubbleSheet from './BubbleSheet';

const SECONDS_PER_QUESTION = 30;
const LIFE_MILESTONES = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];

export default function QuizSurvival({ cluster, onBack, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [lives, setLives] = useState(1);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(SECONDS_PER_QUESTION);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState(null); // 'correct' | 'wrong' | 'timeout'
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const q = await getEndlessQuestions(cluster);
        setQuestions(q);
      } catch (err) {
        console.error("Failed to load survival questions:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cluster]);

  // Question timer + elapsed time
  useEffect(() => {
    if (loading || questions.length === 0 || gameOver || showFeedback) return;

    const timerId = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      setQuestionTimer(prev => {
        if (prev <= 1) {
          // Time's up for this question — treat as wrong
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, questions.length, gameOver, showFeedback, currentIndex]);

  const handleTimeout = useCallback(() => {
    const newLives = lives - 1;
    setLives(newLives);
    setCorrectStreak(0);
    setTotalAnswered(prev => prev + 1);

    if (newLives <= 0) {
      setGameOver(true);
      return;
    }

    setShowFeedback('timeout');
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(null);
      advanceQuestion();
    }, 1500);
  }, [lives, currentIndex, questions]);

  const advanceQuestion = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Ran out of questions — they win!
      setGameOver(true);
    } else {
      setCurrentIndex(nextIndex);
      setQuestionTimer(SECONDS_PER_QUESTION);
      setSelectedAnswer('');
    }
  }, [currentIndex, questions.length]);

  const handleSubmit = () => {
    if (!selectedAnswer || showFeedback) return;

    const currentQ = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQ.correctAnswer;
    const newAnswers = { ...answers, [currentQ.id]: selectedAnswer };
    setAnswers(newAnswers);

    const newTotalAnswered = totalAnswered + 1;
    setTotalAnswered(newTotalAnswered);

    if (isCorrect) {
      const newCorrect = totalCorrect + 1;
      const newStreak = correctStreak + 1;
      setTotalCorrect(newCorrect);
      setCorrectStreak(newStreak);

      // Check for life milestone
      if (LIFE_MILESTONES.includes(newTotalAnswered)) {
        setLives(prev => prev + 1);
      }

      setShowFeedback('correct');
      feedbackTimeoutRef.current = setTimeout(() => {
        setShowFeedback(null);
        advanceQuestion();
      }, 800);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setCorrectStreak(0);

      if (newLives <= 0) {
        setShowFeedback('wrong');
        feedbackTimeoutRef.current = setTimeout(() => {
          setShowFeedback(null);
          setGameOver(true);
        }, 1200);
      } else {
        setShowFeedback('wrong');
        feedbackTimeoutRef.current = setTimeout(() => {
          setShowFeedback(null);
          advanceQuestion();
        }, 1200);
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="container" style={{ textAlign: 'center' }}>Loading survival mode...</div>;
  if (questions.length === 0) return <div className="container">No questions found for {cluster}. <button onClick={onBack} className="btn-primary">Back</button></div>;

  // GAME OVER screen
  if (gameOver) {
    return (
      <div className="container">
        <div className="paper-card" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h2 className="app-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💀 Game Over</h2>
          <p className="subtitle bold" style={{ fontSize: '1.3rem', marginBottom: '2rem' }}>You survived {totalAnswered} questions!</p>

          <div className="survival-stats-grid">
            <div className="survival-stat">
              <span className="survival-stat-value text-success">{totalCorrect}</span>
              <span className="survival-stat-label">Correct</span>
            </div>
            <div className="survival-stat">
              <span className="survival-stat-value text-error">{totalAnswered - totalCorrect}</span>
              <span className="survival-stat-label">Wrong</span>
            </div>
            <div className="survival-stat">
              <span className="survival-stat-value text-primary">{formatTime(elapsedTime)}</span>
              <span className="survival-stat-label">Time</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button onClick={() => onComplete(questions.slice(0, totalAnswered), answers, elapsedTime)} className="btn-primary">
              View Results
            </button>
            <button onClick={onBack} className="btn-light">Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) {
    setGameOver(true);
    return null;
  }

  const timerPercent = (questionTimer / SECONDS_PER_QUESTION) * 100;
  const timerDanger = questionTimer <= 10;

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">💀 Survival Mode</h2>
          <p className="subtitle bold">Question #{totalAnswered + 1} • {cluster}</p>
        </div>
        <div className="align-items-center">
          <div className="survival-lives">
            {Array.from({ length: lives }).map((_, i) => (
              <span key={i} className="life-heart">❤️</span>
            ))}
          </div>
          <button onClick={onBack} className="btn-light btn-small">Quit</button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="survival-bar">
        <span className="survival-bar-item">🔥 Streak: {correctStreak}</span>
        <span className="survival-bar-item">✅ {totalCorrect}/{totalAnswered}</span>
        <span className="survival-bar-item">⏱️ {formatTime(elapsedTime)}</span>
      </div>

      {/* Question timer progress bar */}
      <div className="question-timer-bg">
        <div
          className={`question-timer-fill ${timerDanger ? 'danger' : ''}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>
      <p className={`question-timer-text ${timerDanger ? 'text-error' : ''}`}>
        {questionTimer}s remaining
      </p>

      <div className={`paper-card ${showFeedback === 'correct' ? 'feedback-correct' : ''} ${showFeedback === 'wrong' || showFeedback === 'timeout' ? 'feedback-wrong' : ''}`}>
        <h3 className="section-title">{currentQ.questionText}</h3>
        <BubbleSheet
          options={currentQ.choices}
          selected={selectedAnswer}
          onSelect={setSelectedAnswer}
        />

        {showFeedback === 'timeout' && (
          <p className="text-error bold" style={{ marginTop: '1rem', textAlign: 'center' }}>⏰ Time's up!</p>
        )}
        {showFeedback === 'correct' && (
          <p className="text-success bold" style={{ marginTop: '1rem', textAlign: 'center' }}>✅ Correct!</p>
        )}
        {showFeedback === 'wrong' && (
          <p className="text-error bold" style={{ marginTop: '1rem', textAlign: 'center' }}>❌ Wrong! Answer: {currentQ.correctAnswer}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={!selectedAnswer || !!showFeedback}
          >
            Lock In
          </button>
        </div>
      </div>
    </div>
  );
}
