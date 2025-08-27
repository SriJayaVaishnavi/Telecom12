import React from 'react';

const getConfidenceClass = (confidence) => {
  if (confidence >= 0.8) return 'confidence-green';
  if (confidence >= 0.6) return 'confidence-amber';
  return 'confidence-grey';
};

const Suggestions = ({ suggestions }) => {
  return (
    <div className="card">
      <h4>Suggestions</h4>
      {suggestions.map((suggestion, index) => (
        <div key={index} className={`card ${getConfidenceClass(suggestion.confidence)}`}>
          <h5>{suggestion.title} (Confidence: {suggestion.confidence * 100}%)</h5>
          <p><strong>Reason:</strong> {suggestion.reason}</p>
        </div>
      ))}
    </div>
  );
};

export default Suggestions;
