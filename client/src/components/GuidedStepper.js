import React from 'react';

const GuidedStepper = ({ playbook, onStepAction }) => {
  const isActionable = (step) => {
    return (step.action === 'quick_action' || step.action === 'api_call') && step.status === 'pending';
  };

  const getButtonText = (step) => {
    if (step.action_id === 'line_test') return 'Run Line Test';
    if (step.action === 'api_call') return 'Execute Rollback';
    return 'Perform Action';
  };

  return (
    <div className="card">
      <h4>{playbook.title}</h4>
      {playbook.steps.map((step) => (
        <div key={step.id} className="card step-card">
          <p><strong>Step {step.id}:</strong> {step.title}</p>
          {step.script_text && <p className="script-text"><em>"{step.script_text}"</em></p>}
          <p>Status: <span className={`status-${step.status}`}>{step.status}</span></p>
          {step.evidence && <p className="evidence-text"><strong>Evidence:</strong> {step.evidence}</p>}
          {isActionable(step) && (
            <button className="action-button" onClick={() => onStepAction(step.id)}>
              {getButtonText(step)}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default GuidedStepper;
