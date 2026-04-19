import React, { useState } from 'react';

export default function MockExamSetup({ onCancel, onStart }) {
  const [mockLimit, setMockLimit] = useState(75);

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h2 className="app-title text-gradient">Mock Exam Setup</h2>
          <p className="subtitle">Configure your simulation mode</p>
        </div>
        <button onClick={onCancel} className="btn-light btn-small">Cancel</button>
      </header>
      
      <div className="paper-card">
        <h3 className="section-title">1. Simulation Mode</h3>
        <p className="muted-text mb-4">
          This mock exam will pull questions randomly across all General Education categories following the official Table of Specifications (TOS) and Bloom's Taxonomy breakdown.
        </p>
        
        <div className="grid-gap-1 mb-4">
          <div 
            className={`bubble-option setup-option ${mockLimit === 75 ? 'selected cat-blue' : ''}`} 
            onClick={() => setMockLimit(75)}
          >
            <strong className={mockLimit === 75 ? 'text-primary' : ''}>Half Practice (75 Items)</strong>
            <span className="timer-text">~1 Hour</span>
          </div>
          
          <div 
            className={`bubble-option setup-option ${mockLimit === 150 ? 'selected cat-purple' : ''}`} 
            onClick={() => setMockLimit(150)}
          >
            <strong className={mockLimit === 150 ? 'text-primary' : ''}>Mock Board (150 Items)</strong>
            <span className="timer-text">~2 Hours</span>
          </div>
        </div>

        <button 
          className="btn-primary btn-full" 
          onClick={() => onStart(mockLimit)}
        >
          Start Simulation
        </button>
      </div>
    </div>
  );
}
