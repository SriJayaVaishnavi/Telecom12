// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AgentDesktop from './components/AgentDesktop';
import CallAudioPlayer from './components/CallAudioPlayer';
import TicketsHub from './components/TicketsHub';
import KnowledgeHub from './components/KnowledgeHub'; // NEW
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const audioPlayerRef = useRef(null);
  const BACKEND_URL = "http://localhost:5000";

  // Poll for transcript updates
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
      const res1 = await fetch(`${BACKEND_URL}/api/ensure-agent-intro`);
      const { file: agentIntro } = await res1.json();

      await fetch(`${BACKEND_URL}/api/ensure-caller-transcript`);

      const res3 = await fetch(`${BACKEND_URL}/api/ensure-gemini-response`);
      const { file: geminiResponse } = await res3.json();

      const sources = [agentIntro, '/audio/caller_full.wav', geminiResponse];

      if (audioPlayerRef.current) {
        audioPlayerRef.current.playAudio(sources);
      }
    } catch (err) {
      console.error('❌ Call simulation failed:', err);
    }
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route
          path="/"
          element={
            <div className="App">
              {!callActive ? (
                // Idle Screen
                <div style={{
                  height: '100vh',
                  width: '100vw',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f3f4f6',
                  fontFamily: 'Segoe UI, sans-serif'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '48px',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '100%'
                  }}>
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
                      🎧
                    </div>
                    <h2 style={{
                      margin: '0 0 8px 0',
                      fontSize: '1.75rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      Agent is Idle
                    </h2>
                    <p style={{
                      margin: '8px 0 32px 0',
                      fontSize: '1rem',
                      color: '#6b7280'
                    }}>
                      Waiting for the next incoming call.
                    </p>
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
                        margin: '0 auto',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>📞</span>
                      Simulate Incoming Call (Adrian Miller)
                    </button>
                  </div>
                </div>
              ) : (
                // Agent Desktop
                <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                  <AgentDesktop transcript={transcript} />
                  <CallAudioPlayer ref={audioPlayerRef} />
                </div>
              )}
            </div>
          }
        />
        <Route path="/tickets" element={<TicketsHub />} />
        <Route path="/knowledge-hub" element={<KnowledgeHub />} /> {/* NEW */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;