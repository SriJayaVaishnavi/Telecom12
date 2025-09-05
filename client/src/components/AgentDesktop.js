// src/components/AgentDesktop.js
import React, { useState, useEffect, useRef } from 'react';

import HeaderBar from './HeaderBar';
import CRMPanel from './CRMPanel';
import TranscriptPane from './TranscriptPane';
import IntentChips from './IntentChips';
import Suggestions from './Suggestions';
import GuidedStepper from './GuidedStepper';
import NotesWrapUp from './NotesWrapUp';

// Mock data — ✅ Ensure these files exist
import crmData from '../data/crm.json';
import initialStepsData from '../data/steps.json';
import smsData from '../data/sms.json';
import ticketData from '../data/ticket.json'; // Must exist

const AgentDesktop = () => {
  const [transcript, setTranscript] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [playbook, setPlaybook] = useState(initialStepsData);
  const [wrapUp, setWrapUp] = useState({ summary: '', disposition: '', notes: '' });
  const [smsSent, setSmsSent] = useState(false);
  const messageCountRef = useRef(0); // Track number of messages processed

  // Refs for WebSocket
  const wsRef = useRef(null);

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
          
          // Ignore ping-pong and system messages
          if (message.type || !message.speaker || !message.text) {
            return;
          }
          
          // Calculate delay based on message count
          let delay;
          messageCountRef.current += 1;
          
          if (messageCountRef.current === 1) {
            delay = 15000; // 10 seconds for first message
          } else if (messageCountRef.current === 2) {
            delay = 17000; // 15 seconds for second message
          } else {
            delay = 22000; // 17 seconds for third and subsequent messages
          }
          
          console.log(`🕒 Adding message with ${delay/1000} second delay`);
          
          setTimeout(() => {
            // ✅ Add the message directly to the transcript using functional update
            setTranscript(prevTranscript => {
              // Avoid duplicates by checking the last message
              const lastMsg = prevTranscript[prevTranscript.length - 1];
              if (lastMsg && lastMsg.speaker === message.speaker && lastMsg.text === message.text) {
                console.log(`🟨 Ignoring duplicate message: ${message.text}`);
                return prevTranscript;
              }
              const newTranscript = [...prevTranscript, message];
              
              // Fetch suggestions with the updated transcript
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
  }, []); // Empty dependency array

  // ✅ NEW: Save transcript to the static file
  // This runs every time the transcript changes
  useEffect(() => {
    // This function simulates writing to the file system
    // In a real React app, you can't write to the file system directly.
    // However, for development, we can use a "fake" fetch to a backend endpoint
    // that will save it, OR we can rely on the backend's WebSocket to do it.
    
    // For the absolute easiest way, let's assume your backend has an endpoint
    // like /api/save-transcript that we can POST to.
    
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
  }, [transcript]); // This runs whenever the transcript changes

  // ✅ Fetch AI Suggestions - Accepts the current transcript
  const fetchSuggestions = async (currentTranscript) => {
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
        "Ask if the issue started after the firmware update.",
        "Run a line diagnostic test.",
        "Suggest a firmware rollback if flaps are detected."
      ]);
    }
  };

  // ✅ Initial fetch for suggestions
  useEffect(() => {
    if (transcript.length > 0) {
      fetchSuggestions(transcript);
    }
  }, [transcript]);

  // ✅ Handle step action in playbook
  const handleStepAction = (stepId) => {
    setPlaybook((prevPlaybook) => {
      const newSteps = prevPlaybook.steps.map((step) => {
        if (step.id === stepId) {
          let evidence = 'Completed';
          if (step.action === 'quick_action' && step.action_id === 'line_test') {
            evidence = step.id === 1
              ? 'Result: Link flaps detected.'
              : 'Result: Line is now stable.';
          }
          return { ...step, status: 'completed', evidence };
        }
        return step;
      });
      return { ...prevPlaybook, steps: newSteps };
    });
  };

  const handleGenerateSummary = () => {
    fetch('http://localhost:5000/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, ticket: ticketData, playbook })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
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

  // ✅ Send SMS
  const handleSendSms = () => {
    setSmsSent(true);
  };

  return (
    <>
      <HeaderBar agent={crmData.agent} customer={crmData.customer} />
      <div className="crm-panel">
        <CRMPanel customer={crmData.customer} />
      </div>
      <div className="live-assist-panel">
        <TranscriptPane transcript={transcript} />
        <IntentChips intents={[]} />
        <Suggestions suggestions={suggestions} />
        <GuidedStepper playbook={playbook} onStepAction={handleStepAction} />
        <NotesWrapUp
          wrapUp={wrapUp}
          sms={smsData}
          smsSent={smsSent}
          onGenerateSummary={handleGenerateSummary}
          onSendSms={handleSendSms}
          onUpdateWrapUp={handleUpdateWrapUp}
        />
      </div>
    </>
  );
};

export default AgentDesktop;
