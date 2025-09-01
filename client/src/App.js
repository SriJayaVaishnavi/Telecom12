import React, { useState, useRef } from 'react';
import AgentDesktop from './components/AgentDesktop';
import CallAudioPlayer from './components/CallAudioPlayer';
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);
  const audioPlayerRef = useRef(null);

  const handleStartCall = () => {
    // This simulates the screen-pop
    setCallActive(true);
    setTimeout(() => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.playAudio();
      }
    }, 100); // Add a small delay
  };

  return (
    <div className="App">
      {callActive ? (
        <AgentDesktop />
      ) : (
        <div className="pre-call-container">
          <h1>Agent is Idle</h1>
          <button onClick={handleStartCall}>Simulate Incoming Call (Anna Müller)</button>
        </div>
      )}
      <CallAudioPlayer ref={audioPlayerRef} />
    </div>
  );
}

export default App;
