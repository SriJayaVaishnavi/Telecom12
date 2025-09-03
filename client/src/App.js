// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import AgentDesktop from './components/AgentDesktop';
import CallAudioPlayer from './components/CallAudioPlayer';
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    if (!callActive) return;

    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.action === 'play' && message.url) {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.playAudio(message.url);
        }
      } else if (message.speaker) {
        setTranscript(prev => [...prev, message]);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [callActive]);

  const handleStartCall = () => {
    setCallActive(true);
    // Clear previous transcript
    setTranscript([]);

    fetch('http://localhost:5000/api/start-simulation', {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => console.log(data.status))
    .catch(err => console.error("Failed to start simulation:", err));
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