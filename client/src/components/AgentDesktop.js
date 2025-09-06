
// src/components/AgentDesktop.js
import React, { useState, useEffect, useRef } from 'react';

import HeaderBar from './HeaderBar';
import CRMPanel from './CRMPanel';
import TranscriptPane from './TranscriptPane';
import IntentChips from './IntentChips';
import Suggestions from './Suggestions';
import NotesWrapUp from './NotesWrapUp';

// Mock data — ✅ Ensure these files exist
import crmData from '../data/crm.json';
import initialStepsData from '../data/steps.json';
import smsData from '../data/sms.json';
import ticketData from '../data/ticket.json'; // Must exist

const AgentDesktop = () => {
  const [transcript, setTranscript] = useState([]);
  const [suggestions, setSuggestions] = useState(["Analyzing..."]);
  const [wrapUp, setWrapUp] = useState({ summary: '', disposition: '', notes: '' });
  const [smsSent, setSmsSent] = useState(false);
  const messageCountRef = useRef(0); // Track number of messages processed

  // Refs for WebSocket
  const wsRef = useRef(null);

  // Fetch suggestions when transcript changes
  useEffect(() => {
    if (transcript.length > 0) {
      fetchSuggestions(transcript);
    }
  }, [transcript]);

  // ✅ Update wrap-up fields manually
  const handleUpdateWrapUp = (field, value) => {
    setWrapUp(prev => ({ ...prev, [field]: value }));
  };

  // ✅ WebSocket: Real-time transcript
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.log('[WS] Connection already exists, not creating a new one.');
        return;
      }

      console.log('[WS] Connecting to ws://localhost:5000/transcribe');
      const ws = new WebSocket('ws://localhost:5000/transcribe');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'transcription_update') {
            setTranscript(prevTranscript => {
              const newTranscript = [...prevTranscript];
              const lastMessage = newTranscript[newTranscript.length - 1];
              if (lastMessage && lastMessage.speaker === 'Agent') {
                lastMessage.text = message.text;
                lastMessage.isFinal = true;
                console.log('🔄 Updated agent transcription:', message.text);
              }
              return newTranscript;
            });
            return;
          }
          
          if (message.type || !message.speaker || !message.text) {
            return;
          }
          
          let delay;
          messageCountRef.current += 1;
          
          if (message.speaker === 'Agent') {
            delay = 0;
          } else {
            if (messageCountRef.current === 1) delay = 15000;
            else if (messageCountRef.current === 2) delay = 17000;
            else delay = 22000;
          }
          
          console.log(`🕒 Adding ${message.speaker} message with ${delay/1000} second delay`);
          
          setTimeout(() => {
            setTranscript(prevTranscript => {
              const lastMsg = prevTranscript[prevTranscript.length - 1];
              if (lastMsg && lastMsg.speaker === message.speaker && lastMsg.text === message.text) {
                console.log(`🟨 Ignoring duplicate message: ${message.text}`);
                return prevTranscript;
              }
              
              const newTranscript = [...prevTranscript, { ...message, timestamp: new Date().toISOString(), isFinal: false }];
              fetchSuggestions(newTranscript);
              return newTranscript;
            });
          }, delay);
          
        } catch (err) {
          console.error('[WS] Error processing message:', err, 'Data:', event.data);
        }
      };

      ws.onclose = (e) => {
        console.log(`[WS] Disconnected. Code: ${e.code}, Reason: ${e.reason || 'No reason provided'}`);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (transcript.length > 0) {
      fetch('http://localhost:5000/api/save-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transcript)
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log('✅ Transcript saved to server');
      })
      .catch(err => {
        console.error('❌ Failed to save transcript:', err);
      });
    }
  }, [transcript]);

  const fetchSuggestions = async (currentTranscript = transcript) => {
    try {
      const res = await fetch('http://localhost:5000/api/agent-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript, ticket: ticketData })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setSuggestions([
        "Ask if the issue started after the firmware update",
        "Run a line diagnostic test",
        "Check firmware version"
      ]);
    }
  };

  const handleGenerateSummary = () => {
    fetch('http://localhost:5000/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, ticket: ticketData })
    })
    .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
    .then(data => {
      console.log("✅ AI Summary Received:", data);
      setWrapUp(data);
    })
    .catch(err => {
      console.error("❌ Failed to generate summary:", err);
      setWrapUp({
        summary: "Customer reported internet disconnects after recent firmware update...",
        disposition: "Resolved – Firmware Rollback Applied",
        notes: "Followed playbook KB-ONT-014..."
      });
    });
  };

  const handleSendSms = () => setSmsSent(true);

  return (
    // Root container ensures the entire component uses the full screen
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#f4f7fa' 
    }}>
      <HeaderBar agent={crmData.agent} customer={crmData.customer} />

      {/* Main Layout for the two columns */}
      <div style={{
        flex: 1, // Allows this container to fill the remaining vertical space
        display: 'flex',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden' // Prevents this container from scrolling, allowing children to scroll
      }}>
        
        {/* LEFT PANEL: Fixed Width */}
        <div style={{
          flex: '0 0 340px', // Fixed width: No grow, No shrink, 340px basis
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          {/* Card Component */}
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <CRMPanel customer={crmData.customer} />
          </div>

          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Ticket Details</h4>
            <button style={{
                padding: '10px 14px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
            }}>
              Search Ticket
            </button>
          </div>

          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Knowledge Base</h4>
            <input
              type="text"
              placeholder="Search KB..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            {/* The search button was missing from the screenshot, added back */}
            <button style={{
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
            }}>
              Search
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Fluid Width */}
        <div style={{
          flex: '1 1 auto', // Fluid width: Fills remaining horizontal space
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>

          {/* Card Component */}
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            flex: '1', // Allows this card to take up more vertical space
            minHeight: '200px'
          }}>
            <TranscriptPane transcript={transcript} />
            <IntentChips intents={[]} />
          </div>

          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>
             
            </h4>
            <Suggestions suggestions={suggestions} />
          </div>

          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <NotesWrapUp
              wrapUp={wrapUp}
              sms={smsData}
              smsSent={smsSent}
              onGenerateSummary={handleGenerateSummary}
              onSendSms={handleSendSms}
              onUpdateWrapUp={handleUpdateWrapUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDesktop;

