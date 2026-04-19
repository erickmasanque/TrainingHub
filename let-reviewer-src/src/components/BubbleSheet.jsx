import React from 'react';
import { playSelect } from '../services/sounds';

export default function BubbleSheet({ options, selected, onSelect }) {
  // options is an object like { A: "Option 1", B: "Option 2" }
  const safeOptions = options || {};
  // Sort alphabetically to guarantee A, B, C, D order (Firestore doesn't preserve key order)
  const sortedEntries = Object.entries(safeOptions).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="bubble-sheet-container">
      {sortedEntries.map(([key, text]) => (
        <label key={key} className="bubble-option">
          <input 
            type="radio" 
            name="quiz-option" 
            value={key} 
            checked={selected === key} 
            onChange={() => { playSelect(); onSelect(key); }} 
          />
          <div className="bubble-circle">{key}</div>
          <span style={{ fontSize: '1.1rem' }}>{text}</span>
        </label>
      ))}
    </div>
  );
}
