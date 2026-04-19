import React from 'react';

export default function BubbleSheet({ options, selected, onSelect }) {
  // options is an object like { A: "Option 1", B: "Option 2" }
  const safeOptions = options || {};
  return (
    <div className="bubble-sheet-container">
      {Object.entries(safeOptions).map(([key, text]) => (
        <label key={key} className="bubble-option">
          <input 
            type="radio" 
            name="quiz-option" 
            value={key} 
            checked={selected === key} 
            onChange={() => onSelect(key)} 
          />
          <div className="bubble-circle">{key}</div>
          <span style={{ fontSize: '1.1rem' }}>{text}</span>
        </label>
      ))}
    </div>
  );
}
