import React, { useState } from 'react';
import { seedQuestionsFromCSVText } from '../services/db';

export default function Seeder() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const count = await seedQuestionsFromCSVText(text);
      setResult(`Success! Uploaded ${count} questions to Firestore.`);
    } catch (error) {
      console.error(error);
      setResult("Error uploading questions. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-card" style={{marginTop: '2rem', border: '1px dashed var(--color-correction-blue)'}}>
      <h3 style={{color: 'var(--color-correction-blue)'}}>Admin: Upload Questions CSV</h3>
      <p style={{fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-muted)'}}>
        Upload your `questions.csv` here. Format: <code>Number, Subject, Bloom, Question, Choice A, Choice B, Choice C, Choice D, Answer, Explanation</code>.
      </p>
      <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} />
      {loading && <p>Uploading...</p>}
      {result && <p style={{marginTop: '1rem', fontWeight: 'bold'}}>{result}</p>}
    </div>
  );
}
