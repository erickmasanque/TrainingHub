import React, { useState } from 'react';
import { reportQuestion } from '../services/db';
import { playClick, playSelect, playConfirm } from '../services/sounds';

const REASONS = [
  'Wrong answer marked as correct',
  'Duplicate or identical choices',
  'Question text is unclear or incomplete',
  'Choices don\'t match the question',
  'Incorrect explanation',
  'Other'
];

export default function ReportButton({ questionId, uid }) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSending(true);
    try {
      await reportQuestion(questionId, uid, selectedReason);
      playConfirm();
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setSelectedReason('');
      }, 1500);
    } catch (err) {
      console.error("Failed to report:", err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return <p className="report-sent">✅ Report sent. Thank you!</p>;
  }

  if (!open) {
    return (
      <button className="report-toggle-btn" onClick={() => { playClick(); setOpen(true); }}>
        🚩 Report a Problem
      </button>
    );
  }

  return (
    <div className="report-panel">
      <p className="report-panel-title">What's wrong with this question?</p>
      <div className="report-reasons">
        {REASONS.map(reason => (
          <label key={reason} className={`report-reason-option ${selectedReason === reason ? 'selected' : ''}`}>
            <input
              type="radio"
              name="report-reason"
              value={reason}
              checked={selectedReason === reason}
              onChange={() => { playSelect(); setSelectedReason(reason); }}
              style={{ display: 'none' }}
            />
            {reason}
          </label>
        ))}
      </div>
      <div className="report-actions">
        <button className="btn-light btn-small" onClick={() => { setOpen(false); setSelectedReason(''); }}>Cancel</button>
        <button className="btn-primary btn-small" onClick={handleSubmit} disabled={!selectedReason || sending}>
          {sending ? 'Sending...' : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
