// src/components/AgentDesktop.js
import React, { useState, useEffect } from 'react';

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
  const [intents, setIntents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [playbook, setPlaybook] = useState(initialStepsData);
  const [wrapUp, setWrapUp] = useState({ summary: '', disposition: '', notes: '' });
  const [smsSent, setSmsSent] = useState(false);

  // ✅ Update wrap-up fields manually
  const handleUpdateWrapUp = (field, value) => {
    setWrapUp(prev => ({ ...prev, [field]: value }));
  };

  // ✅ WebSocket: Real-time transcript
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setTranscript(prev => [...prev, message]);
      } catch (err) {
        console.error("Invalid message received:", event.data);
      }
    };
    ws.onclose = () => console.log('WebSocket disconnected');
    ws.onerror = (err) => console.error('WebSocket error:', err);
    return () => ws.close();
  }, []);

  // ✅ Fetch AI Suggestions
  useEffect(() => {
    async function fetchAISuggestions() {
      try {
        const res = await fetch('http://localhost:5000/api/agent-suggestions');
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
    }
    fetchAISuggestions();
  }, []);

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
    console.log("Generating AI summary with:", { transcript, ticket: ticketData, playbook });
  
    if (!ticketData) {
      console.error("❌ ticketData is undefined!");
      return;
    }
  
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
        <IntentChips intents={intents} />
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