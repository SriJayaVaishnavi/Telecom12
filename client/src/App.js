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
        <div className="pre-call-container">
          <h1>Agent is Idle</h1>
          <button onClick={handleStartCall}>
            Simulate Incoming Call (Adrian Miller)
          </button>
        </div>
      )}

      {/* Hidden audio player */}
      <CallAudioPlayer ref={audioPlayerRef} />
    </div>
  );
}

export default App;