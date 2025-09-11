// src/components/NotesWrapUp.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketMemoryModule, syncTicketMemory, addKbEntryFromTicket } from '../utils/memoryModules';

const NotesWrapUp = ({ 
  wrapUp, 
  sms, 
  smsSent, 
  onGenerateSummary, 
  onSendSms, 
  onUpdateWrapUp,
  transcript = [], 
  suggestions = [] 
}) => {
  const [ticketStatus, setTicketStatus] = useState(null);
  const [ticketId, setTicketId] = useState(null);
  const navigate = useNavigate();

  const getStatusFromDisposition = (disposition) => {
    if (!disposition) return "Open";
    if (disposition.includes("Resolved")) return "Resolved";
    if (disposition.includes("Pending")) return "Pending";
    if (disposition.includes("Escalated")) return "Escalated";
    return "Open";
  };

  const handleUpdate = (field, value) => {
    onUpdateWrapUp(field, value);
  };

  const handleConvertToTicket = () => {
    if (!wrapUp.summary || !wrapUp.disposition) {
      alert("Please generate AI Solution first.");
      return;
    }

    const status = getStatusFromDisposition(wrapUp.disposition);
    const solution = wrapUp.notes?.trim() 
      ? wrapUp.notes 
      : `Action required: ${wrapUp.disposition}. ${wrapUp.summary}`;

    const newTicket = {
      id: `TKT-${1001 + ticketMemoryModule.length}`,
      status,
      createdAt: new Date().toISOString(),
      customerId: "CUST-78901",
      issueSummary: wrapUp.summary,
      solution,
      transcript: transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
      aiSuggestions: suggestions.length > 0 
        ? suggestions 
        : [
            "Ask if the issue started after the firmware update",
            "Run a line diagnostic test",
            "Check firmware version"
          ],
      disposition: wrapUp.disposition,
      notes: wrapUp.notes
    };

    ticketMemoryModule.push(newTicket);
    syncTicketMemory();
    setTicketId(newTicket.id);
    setTicketStatus("created");
    
    alert('✅ Ticket created successfully! You can add it to the Knowledge Base from the Tickets Hub.');
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
          Generate AI Solution
        </button>

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
        overflowY: 'auto',
        padding: '8px 0'
      }}>
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

      {/* Convert to Ticket or Go to Hub */}
      {!ticketStatus ? (
        <button
          onClick={handleConvertToTicket}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px',
            backgroundColor: '#ea580c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🎫</span>
          Convert Conversation to Ticket
        </button>
      ) : (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#92400e' }}>
            ✅ Ticket {ticketId} created!
          </p>
          <button
            onClick={() => navigate('/tickets')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            🎫 Go to Ticket Hub
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesWrapUp;