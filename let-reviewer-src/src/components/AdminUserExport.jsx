import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminUserExport() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Login Name,Email Address,Total Logins,Time Spent (Minutes),Time Spent (Seconds)\n";
      
      usersSnap.forEach(d => {
        const data = d.data();
        const name = data.nickname || data.name || "Unknown";
        const email = data.email || "N/A";
        const totalLogins = data.analytics?.totalLogins || 0;
        const timeSpentSeconds = data.analytics?.totalTimeSpentSeconds || 0;
        const timeSpentMinutes = (timeSpentSeconds / 60).toFixed(2);
        
        // Escape quotes and commas in name
        const safeName = `"${name.replace(/"/g, '""')}"`;
        const safeEmail = `"${email.replace(/"/g, '""')}"`;
        
        csvContent += `${safeName},${safeEmail},${totalLogins},${timeSpentMinutes},${timeSpentSeconds}\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "user_analytics.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading analytics:", error);
      alert("Error downloading CSV. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-card" style={{ marginTop: '2rem', border: '1px dashed var(--color-correction-blue)' }}>
      <h3 style={{ color: 'var(--color-correction-blue)' }}>Admin: Export User Analytics</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        Download a CSV file containing user login counts, time spent using the app, login names, and email addresses.
      </p>
      
      <button 
        className="btn-light" 
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? 'Generating CSV...' : '📊 Download Analytics CSV'}
      </button>
    </div>
  );
}
