// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import AgentDesktop from './components/AgentDesktop';
import CallAudioPlayer from './components/CallAudioPlayer';
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const audioPlayerRef = useRef(null);
  const BACKEND_URL = "http://localhost:5000"; // Backend runs on port 5000

  // Poll for transcript updates from backend
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/data/transcript.json?v=${Date.now()}`)
        .then(r => r.json())
        .then(data => setTranscript(data))
        .catch(err => console.warn("Failed to load transcript:", err));
    }, 2000);
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  const handleStartCall = async () => {
    setCallActive(true);
    try {
      // 1. Ensure agent intro audio
      const res1 = await fetch(`${BACKEND_URL}/api/ensure-agent-intro`);
      const { file: agentIntro } = await res1.json();

      // 2. Ensure caller transcript is generated from caller_full.wav
      await fetch(`${BACKEND_URL}/api/ensure-caller-transcript`);

      // 3. Ensure Gemini response audio
      const res3 = await fetch(`${BACKEND_URL}/api/ensure-gemini-response`);
      const { file: geminiResponse } = await res3.json();

      // Final playback order: Agent intro → Caller full → Gemini reply
      const sources = [agentIntro, '/audio/caller_full.wav', geminiResponse];
      console.log('[App] Final audio queue:', sources);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.playAudio(sources);
      }
    } catch (err) {
      console.error('❌ Call simulation failed:', err);
    }
  };

  return (
    <div className="App">
      {callActive ? (
        <AgentDesktop transcript={transcript} />
      ) : (
        // Modern "Agent is Idle" Screen
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6', // Light gray background
          fontFamily: 'Segoe UI, sans-serif'
        }}>
          {/* Central Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '48px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Status Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              color: '#6b7280',
              fontSize: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ☕
            </div>

            {/* Status Heading */}
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '1.75rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Agent is Idle
            </h2>

            {/* Subtitle */}
            <p style={{
              margin: '8px 0 32px 0',
              fontSize: '1rem',
              color: '#6b7280'
            }}>
              Waiting for the next incoming call.
            </p>

            {/* Action Button */}
            <button
              onClick={handleStartCall}
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '32px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#4338ca';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#4f46e5';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <span>📞</span>
              Simulate Incoming Call (Adrian Miller)
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio player */}
      <CallAudioPlayer ref={audioPlayerRef} />
    </div>
  );
}

export default App;