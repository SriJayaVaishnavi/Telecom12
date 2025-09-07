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
  const handleUpdate = (field, value) => {
    onUpdateWrapUp(field, value);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '4px'
      }}>
        {/* Generate AI Summary Button */}
        <button
          onClick={onGenerateSummary}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>✨</span>
          Generate AI Summary
        </button>

        {/* Send SMS Button */}
        <button
          onClick={onSendSms}
          disabled={smsSent}
          style={{
            padding: '8px 16px',
            backgroundColor: smsSent ? '#22c55e' : '#d1d5db',
            color: smsSent ? 'white' : '#1f2937',
            border: 'none',
            borderRadius: '6px',
            cursor: smsSent ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>📤</span>
          {smsSent ? 'SMS Sent' : 'Send SMS'}
        </button>
      </div>

      {/* Form Fields */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto', // ✅ Enables scrolling when content overflows
        padding: '8px 0'
      }}>
        {/* Summary Field */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
          }}>
            Summary
          </label>
          <textarea
            value={wrapUp.summary || ''}
            onChange={(e) => handleUpdate('summary', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              resize: 'vertical',
              fontSize: '14px',
              lineHeight: 1.5,
              minHeight: '80px',
              maxHeight: '200px'
            }}
          />
        </div>

        {/* Disposition Field */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
          }}>
            Disposition
          </label>
          <select
            value={wrapUp.disposition || ''}
            onChange={(e) => handleUpdate('disposition', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Select disposition...</option>
            <option value="Resolved – Firmware Rollback Applied">Resolved – Firmware Rollback Applied</option>
            <option value="Pending – Further Investigation">Pending – Further Investigation</option>
            <option value="Escalated – Technical Support">Escalated – Technical Support</option>
          </select>
        </div>

        {/* Case Notes Field */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
          }}>
            Case Notes
          </label>
          <textarea
            value={wrapUp.notes || ''}
            onChange={(e) => handleUpdate('notes', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              resize: 'vertical',
              fontSize: '14px',
              lineHeight: 1.5,
              minHeight: '80px',
              maxHeight: '200px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NotesWrapUp;