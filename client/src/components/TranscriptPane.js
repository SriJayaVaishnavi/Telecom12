import React, { useEffect, useRef } from 'react';

const TranscriptPane = ({ transcript }) => {
  // 1. Create a ref to get direct access to the scrollable div
  const scrollContainerRef = useRef(null);

  // 2. This hook runs every time the transcript updates
  useEffect(() => {
    if (scrollContainerRef.current) {
      // It sets the scroll position to the very bottom
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transcript]); // Dependency array: runs only when 'transcript' changes

  return (
    // We make the card a flex container so the transcript list can grow to fill the space
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <h4 style={{ flexShrink: 0 }}>Live Transcript</h4>
      
      {/* 3. Attach the ref and add styles to make this div scrollable */}
      <div 
        ref={scrollContainerRef} 
        style={{ 
          flex: 1,              // Allows this div to fill the available height
          overflowY: 'auto'     // Adds a scrollbar only when needed
        }}
      >
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