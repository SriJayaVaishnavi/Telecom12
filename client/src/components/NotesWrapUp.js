// src/components/NotesWrapUp.js
import React from 'react';

const NotesWrapUp = ({
  wrapUp,
  sms,
  smsSent,
  onGenerateSummary,
  onSendSms,
  onUpdateWrapUp
}) => {
  // 🔍 Debug: Log every time this component renders
  console.log("🔄 NotesWrapUp: Component rendered");
  console.log("📝 wrapUp:", wrapUp);
  console.log("📤 onGenerateSummary type:", typeof onGenerateSummary);
  console.log("📤 onGenerateSummary value:", onGenerateSummary);

  // 🛡️ Safe handler with fallback
  const handleGenerateClick = () => {
    console.log("🎯 [NotesWrapUp] Generate AI Summary button clicked!");

    if (typeof onGenerateSummary === 'function') {
      console.log("✅ Calling onGenerateSummary()");
      onGenerateSummary();
    } else {
      console.error("❌ onGenerateSummary is not a function!", onGenerateSummary);
      alert("Error: AI Summary function is not available. Check the console.");
    }
  };

  const handleSendSmsClick = () => {
    if (typeof onSendSms === 'function') {
      onSendSms();
    }
  };

  return (
    <div className="notes-wrapup" style={{ marginTop: '16px', padding: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a1a1a' }}>
        AI-Generated Wrap-Up
      </h3>

      {/* 🔥 Generate AI Summary Button */}
      <button
        onClick={handleGenerateClick}
        style={{
          marginBottom: '16px',
          padding: '10px 16px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Generate AI Summary
      </button>

      {/* Summary Field */}
      <div className="field-group" style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
          Summary
        </label>
        <textarea
          value={wrapUp.summary}
          onChange={(e) => onUpdateWrapUp('summary', e.target.value)}
          rows="3"
          style={{
            width: '100%',
            fontSize: '14px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
          placeholder="Enter summary..."
        />
      </div>

      {/* Disposition Field */}
      <div className="field-group" style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
          Disposition
        </label>
        <input
          type="text"
          value={wrapUp.disposition}
          onChange={(e) => onUpdateWrapUp('disposition', e.target.value)}
          style={{
            width: '100%',
            fontSize: '14px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
          placeholder="Enter disposition..."
        />
      </div>

      {/* Case Notes Field */}
      <div className="field-group" style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
          Case Notes
        </label>
        <textarea
          value={wrapUp.notes}
          onChange={(e) => onUpdateWrapUp('notes', e.target.value)}
          rows="4"
          style={{
            width: '100%',
            fontSize: '14px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
          placeholder="Enter case notes..."
        />
      </div>

      {/* Send SMS Button */}
      <button
        onClick={handleSendSmsClick}
        disabled={smsSent}
        style={{
          padding: '10px 16px',
          backgroundColor: smsSent ? '#6c757d' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: smsSent ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        {smsSent ? 'SMS Sent' : 'Send SMS to Customer'}
      </button>
    </div>
  );
};

export default NotesWrapUp;