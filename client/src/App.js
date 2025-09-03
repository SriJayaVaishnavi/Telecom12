// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import AgentDesktop from './components/AgentDesktop';
import CallAudioPlayer from './components/CallAudioPlayer';
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const audioPlayerRef = useRef(null);

  // List of caller audio files to play in order
  const audioSources = [
    "http://localhost:5000/audio/caller_0.wav",
    "http://localhost:5000/audio/caller_1.wav",
    "http://localhost:5000/audio/caller_2.wav",
    "http://localhost:5000/audio/caller_3.wav"
  ];

  // Poll for transcript updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/data/transcript.json?v=' + Date.now())
        .then(r => r.json())
        .then(data => setTranscript(data))
        .catch(err => console.warn("Failed to load transcript:", err));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartCall = () => {
    setCallActive(true);

    // Small delay to simulate screen-pop
    setTimeout(() => {
      if (audioPlayerRef.current && audioSources.length > 0) {
        audioPlayerRef.current.playAudio(audioSources);
      }
    }, 100);
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