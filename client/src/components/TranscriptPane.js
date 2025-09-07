// src/components/TranscriptPane.js
import React, { useRef, useEffect } from 'react';

const TranscriptPane = ({ transcript }) => {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Scrollable Message Area */}
      <div
        ref={scrollRef}
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '8px 0'
        }}
      >
        {transcript.length === 0 ? (
          <p style={{
            color: '#9ca3af',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            Conversation will appear here...
          </p>
        ) : (
          transcript.map((item, index) => {
            const isAgent = item.speaker === 'Agent';
            const initial = item.speaker.charAt(0).toUpperCase();

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                {/* Speaker Avatar */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isAgent ? '#4f46e5' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                    flexShrink: 0 // Prevent shrinking
                  }}
                >
                  {initial}
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isAgent ? '#f3f4f6' : '#e0e7ff',
                    maxWidth: '80%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Speaker Name */}
                  <p style={{
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    marginBottom: '4px',
                    color: '#111827'
                  }}>
                    {item.speaker}
                  </p>

                  {/* Message Text */}
                  <p style={{
                    color: '#374151',
                    lineHeight: 1.5,
                    margin: 0
                  }}>
                    {item.text}
                  </p>

                  {/* Timestamp */}
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    textAlign: 'right',
                    marginTop: '4px'
                  }}>
                    {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TranscriptPane;