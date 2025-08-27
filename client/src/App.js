import React, { useState } from 'react';
import AgentDesktop from './components/AgentDesktop';
import './App.css';

function App() {
  const [callActive, setCallActive] = useState(false);

  const handleStartCall = () => {
    // This simulates the screen-pop
    setCallActive(true);
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
    </div>
  );
}

export default App;
