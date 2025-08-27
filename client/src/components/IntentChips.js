import React from 'react';

const IntentChips = ({ intents }) => {
  if (!intents || intents.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h4>Detected Intents</h4>
      <div className="intent-chips-container">
        {intents.map((intent, index) => (
          <div key={index} className="intent-chip">
            {intent}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntentChips;
