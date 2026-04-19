import React, { useState, useEffect } from 'react';
import { getQuestionsByCluster, generateMockExam, getDailyChallengeQuestions } from '../services/db';
import BubbleSheet from './BubbleSheet';

export default function Quiz({ cluster, onBack, onComplete, itemCount = 20, isMock = false, isDailyChallenge = false }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(isMock ? (itemCount === 150 ? 7200 : 3600) : null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        let q;
        if (isDailyChallenge) {
          q = await getDailyChallengeQuestions(itemCount);
        } else if (isMock) {
          q = await generateMockExam(itemCount);
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
  }, [cluster, itemCount, isMock, isDailyChallenge]);

  // Timer logic
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    if (isMock && timeLeft !== null && timeLeft <= 0) {
      onComplete(questions, answers, elapsedTime);
      return;
    }

    const timerId = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      if (isMock && timeLeft !== null && timeLeft > 0) {
        setTimeLeft(prev => prev - 1);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [isMock, loading, questions.length, timeLeft, onComplete, answers, questions, elapsedTime]);

  const handleNext = () => {
    if (!selectedAnswer) return;
    
    const newAnswers = { ...answers, [questions[currentIndex].id]: selectedAnswer };
    setAnswers(newAnswers);
    setSelectedAnswer('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
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

  if (loading) return <div className="container" style={{textAlign: 'center'}}>Loading questions...</div>;
  if (questions.length === 0) return <div className="container">No questions found for {cluster}. <button onClick={onBack} className="btn-primary">Back</button></div>;

  const currentQ = questions[currentIndex];
  if (!currentQ) return <div className="container">Error loading question data! <button onClick={onBack} className="btn-primary">Back</button></div>;

  const isWarning = isMock && timeLeft !== null && timeLeft < 300;

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title">{isDailyChallenge ? 'Global Daily Challenge' : (isMock ? `Mock Exam: ${cluster}` : cluster)}</h2>
          <p className="subtitle bold">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <div className="align-items-center">
          {isMock && (
            <div className={`timer-badge ${isWarning ? 'warning' : ''}`}>
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

      <div className="paper-card">
        <h3 className="section-title">{currentQ.questionText}</h3>
        <BubbleSheet 
          options={currentQ.choices} 
          selected={selectedAnswer} 
          onSelect={setSelectedAnswer} 
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button onClick={handleNext} className="btn-primary" disabled={!selectedAnswer}>
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
