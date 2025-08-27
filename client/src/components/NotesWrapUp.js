import React from 'react';

const NotesWrapUp = ({ wrapUp, sms, smsSent, onGenerateSummary, onSendSms }) => {
  return (
    <div className="card">
      <h4>AI-Generated Wrap-Up</h4>
      <button onClick={onGenerateSummary} disabled={wrapUp.summary}>
        Generate AI Summary
      </button>

      {wrapUp.summary && (
        <div className="wrap-up-content">
          <h5>Summary</h5>
          <textarea readOnly value={wrapUp.summary} />
          <h5>Disposition</h5>
          <input type="text" readOnly value={wrapUp.disposition} />
          <h5>Case Notes</h5>
          <textarea readOnly value={wrapUp.notes} rows={4} />
        </div>
      )}

      <div className="sms-section">
        <button onClick={onSendSms} disabled={smsSent}>
          {smsSent ? 'SMS Sent!' : 'Send SMS Follow-up'}
        </button>
        {smsSent && <p className="sms-confirmation">Confirmation sent to customer.</p>}
        <p><small>Template: {sms.text.replace('[CUSTOMER_NAME]', 'Anna Müller').replace('[DATE]', new Date().toLocaleDateString())}</small></p>
      </div>
    </div>
  );
};

export default NotesWrapUp;
