import React, { useState, useEffect } from 'react';

import HeaderBar from './HeaderBar';
import CRMPanel from './CRMPanel';
import TranscriptPane from './TranscriptPane';
import IntentChips from './IntentChips';
import Suggestions from './Suggestions';
import GuidedStepper from './GuidedStepper';
import NotesWrapUp from './NotesWrapUp';

// --- Re-importing mock data directly ---
import crmData from '../data/crm.json';
import allTranscriptData from '../data/transcript.json';
import allSuggestionsData from '../data/suggestions.json';
import initialStepsData from '../data/steps.json';
import smsData from '../data/sms.json';

const AgentDesktop = () => {
  // State for real-time and interactive elements
  const [transcript, setTranscript] = useState([]);
  const [intents, setIntents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [playbook, setPlaybook] = useState(initialStepsData);
  const [wrapUp, setWrapUp] = useState({ summary: '', disposition: '', notes: '' });
  const [smsSent, setSmsSent] = useState(false);

  // --- Reverting to setTimeout simulation for transcript ---
  useEffect(() => {
    allTranscriptData.forEach((turn, index) => {
      setTimeout(() => {
        setTranscript(prev => [...prev, turn]);

        if (turn.intent) {
          setIntents([turn.intent]);
          setSuggestions(allSuggestionsData);
        }
      }, (index + 1) * 1500);
    });
  }, []);

  const handleStepAction = (stepId) => {
    setPlaybook(prevPlaybook => {
      const newSteps = prevPlaybook.steps.map(step => {
        if (step.id === stepId) {
          let evidence = 'Completed';
          if (step.action === 'quick_action' && step.action_id === 'line_test') {
            evidence = step.id === 1 ? 'Result: Link flaps detected.' : 'Result: Line is now stable.';
          } else if (step.action === 'api_call') {
            evidence = 'API Call Successful: Firmware rollback initiated.';
          }
          return { ...step, status: 'completed', evidence: evidence };
        }
        return step;
      });
      return { ...prevPlaybook, steps: newSteps };
    });
  };

  const handleGenerateSummary = () => {
    setWrapUp({
      summary: "Customer reported internet disconnects after recent firmware update (v3.14.2). A line test confirmed link flaps, consistent with a known regression issue. Executed a firmware rollback to the previous stable version (v3.12.9).",
      disposition: "Resolved – Firmware Rollback Applied",
      notes: "Followed playbook KB-ONT-014 to resolve the issue. Post-rollback line test showed a stable connection. Customer confirmed service restoration."
    });
  };

  const handleSendSms = () => {
    setSmsSent(true);
  };

  // No more loading state needed as data is imported directly
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
        />
      </div>
    </>
  );
};

export default AgentDesktop;
