import React from 'react';

const TranscriptPane = ({ transcript }) => {
  return (
    <div className="card">
      <h4>Live Transcript</h4>
      <div>
        {transcript.map((turn, index) => (
          <p key={index}>
            <strong>{turn.speaker}:</strong> {turn.pii_redacted || turn.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default TranscriptPane;
