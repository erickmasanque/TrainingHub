import React, { useState, useEffect, useCallback } from 'react';
import { getEndlessQuestions } from '../services/db';
import BubbleSheet from './BubbleSheet';
import ReportButton from './ReportButton';
import { playClick, playCorrect, playWrong, playFinish } from '../services/sounds';

export default function QuizSandbox({ cluster, onBack, onComplete, userId = null }) {
  const [queue, setQueue] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [masteredCount, setMasteredCount] = useState(0);
  const [originalPoolSize, setOriginalPoolSize] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const q = await getEndlessQuestions(cluster);
        setQueue(q);
        setOriginalPoolSize(q.length);
        if (q.length > 0) {
          setCurrentQuestion(q[0]);
        }
      } catch (err) {
        console.error("Failed to load sandbox questions:", err);
        setQueue([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cluster]);

  // Elapsed time tracker
  useEffect(() => {
    if (loading || queue.length === 0) return;

    const timerId = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, queue.length]);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || showFeedback) return;
    playClick();

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
    setAnswers(newAnswers);
    setTotalAnswered(prev => prev + 1);

    if (isCorrect) {
      playCorrect();
      setTotalCorrect(prev => prev + 1);
      setMasteredCount(prev => prev + 1);
      setShowFeedback('correct');

      setTimeout(() => {
        setShowFeedback(null);
        const newQueue = [...queue];
        newQueue.shift();

        if (newQueue.length === 0) {
          playFinish();
          onComplete(
            Object.keys(newAnswers).map(id => queue.find(q => q.id === id) || currentQuestion),
            newAnswers,
            elapsedTime
          );
          return;
        }

        setQueue(newQueue);
        setCurrentQuestion(newQueue[0]);
        setSelectedAnswer('');
      }, 800);
    } else {
      playWrong();
      setShowFeedback('wrong');

      setTimeout(() => {
        setShowFeedback(null);
        const newQueue = [...queue];
        newQueue.shift();

        const reinjectPos = Math.min(
          newQueue.length,
          Math.floor(Math.random() * 3) + 2
        );
        newQueue.splice(reinjectPos, 0, currentQuestion);

        setQueue(newQueue);
        setCurrentQuestion(newQueue[0]);
        setSelectedAnswer('');
      }, 1500);
    }
  }, [selectedAnswer, showFeedback, currentQuestion, queue, answers, elapsedTime, onComplete]);

  const handleFinishEarly = () => {
    const answeredQuestions = Object.keys(answers).map(id => {
      return queue.find(q => q.id === id) || currentQuestion;
    }).filter(Boolean);

    onComplete(answeredQuestions, answers, elapsedTime);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="container" style={{ textAlign: 'center' }}>Loading sandbox mode...</div>;
  if (queue.length === 0 && !currentQuestion) return <div className="container">No questions found for {cluster}. <button onClick={onBack} className="btn-primary">Back</button></div>;

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">🏖️ Sandbox Mode</h2>
          <p className="subtitle bold">{cluster}</p>
        </div>
        <div className="align-items-center">
          <div className="timer-badge">⏱️ {formatTime(elapsedTime)}</div>
          <button onClick={onBack} className="btn-light btn-small">Quit</button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="sandbox-stats-bar">
        <span className="survival-bar-item">✅ Mastered: {masteredCount}/{originalPoolSize}</span>
        <span className="survival-bar-item">📝 Answered: {totalAnswered}</span>
        <span className="survival-bar-item">🎯 {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}% Accuracy</span>
      </div>

      <div className="sandbox-progress-bg">
        <div
          className="sandbox-progress-fill"
          style={{ width: `${originalPoolSize > 0 ? (masteredCount / originalPoolSize) * 100 : 0}%` }}
        />
      </div>
      <p className="sandbox-progress-text">
        {queue.length} questions remaining in queue
      </p>

      <div className={`paper-card ${showFeedback === 'correct' ? 'feedback-correct' : ''} ${showFeedback === 'wrong' ? 'feedback-wrong' : ''}`}>
        <h3 className="section-title">{currentQuestion?.questionText}</h3>
        <BubbleSheet
          options={currentQuestion?.choices}
          selected={selectedAnswer}
          onSelect={setSelectedAnswer}
        />

        {showFeedback === 'correct' && (
          <p className="text-success bold" style={{ marginTop: '1rem', textAlign: 'center' }}>✅ Mastered! Moving on...</p>
        )}
        {showFeedback === 'wrong' && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <p className="text-error bold">❌ Not quite! Answer: {currentQuestion?.correctAnswer}</p>
            <p className="subtitle" style={{ marginTop: '0.25rem' }}>This question will come back soon for mastery.</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={handleFinishEarly} className="btn-light btn-small">
              Finish Early
            </button>
            <ReportButton questionId={currentQuestion?.id} uid={userId} />
          </div>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={!selectedAnswer || !!showFeedback}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
