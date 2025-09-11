// src/components/AgentDesktop.js
import React, { useState, useEffect, useRef } from 'react';

import CRMPanel from './CRMPanel';
import TranscriptPane from './TranscriptPane';
import IntentChips from './IntentChips';
import NotesWrapUp from './NotesWrapUp';

// Mock data — ✅ Ensure these files exist
import crmData from '../data/crm.json';
import initialStepsData from '../data/steps.json';
import smsData from '../data/sms.json';
import ticketData from '../data/ticket.json'; // Array of tickets

const AgentDesktop = () => {
  const [transcript, setTranscript] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [wrapUp, setWrapUp] = useState({ summary: '', disposition: '', notes: '' });
  const [smsSent, setSmsSent] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [searchedTicket, setSearchedTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kbResults, setKbResults] = useState([]);
  const messageCountRef = useRef(0);

  // Refs for WebSocket
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  // Start call timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Format duration as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ✅ Update wrap-up fields manually
  const handleUpdateWrapUp = (field, value) => {
    setWrapUp(prev => ({ ...prev, [field]: value }));
  };

  // ✅ WebSocket: Real-time transcript
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.log('[WS] Connection already exists, not creating a new one.');
        return;
      }

      console.log('[WS] Connecting to ws://localhost:5000/transcribe');
      const ws = new WebSocket('ws://localhost:5000/transcribe');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'transcription_update') {
            setTranscript(prevTranscript => {
              const newTranscript = [...prevTranscript];
              const lastMessage = newTranscript[newTranscript.length - 1];
              if (lastMessage && lastMessage.speaker === 'Agent') {
                lastMessage.text = message.text;
                lastMessage.isFinal = true;
                console.log('🔄 Updated agent transcription:', message.text);
              }
              return newTranscript;
            });
            return;
          }
          
          if (message.type || !message.speaker || !message.text) return;
          
          let delay;
          messageCountRef.current += 1;
          
          if (message.speaker === 'Agent') {
            delay = 0;
          } else {
            delay = messageCountRef.current === 1 ? 15000 : 
                    messageCountRef.current === 2 ? 17000 : 22000;
          }
          
          setTimeout(() => {
            setTranscript(prevTranscript => {
              const lastMsg = prevTranscript[prevTranscript.length - 1];
              if (lastMsg && lastMsg.speaker === message.speaker && lastMsg.text === message.text) {
                console.log(`🟨 Ignoring duplicate: ${message.text}`);
                return prevTranscript;
              }
              
              const newTranscript = [...prevTranscript, {
                ...message,
                timestamp: new Date().toISOString(),
                isFinal: false
              }];
              
              // ✅ Removed auto-fetch — ONLY fetch on button click
              // fetchSuggestions(newTranscript); // ❌ REMOVED
              return newTranscript;
            });
          }, delay);
          
        } catch (err) {
          console.error('[WS] Error processing message:', err, 'Data:', event.data);
        }
      };

      ws.onclose = (e) => {
        console.log(`[WS] Disconnected. Code: ${e.code}, Reason: ${e.reason || 'No reason provided'}`);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ✅ Save transcript
  useEffect(() => {
    if (transcript.length > 0) {
      fetch('http://localhost:5000/api/save-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transcript)
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log('✅ Transcript saved to server');
      })
      .catch(err => {
        console.error('❌ Failed to save transcript:', err);
      });
    }
  }, [transcript]);

  // ✅ Fetch AI Suggestions (Manual Trigger)
  const fetchSuggestions = async (currentTranscript = transcript) => {
    try {
      // Create a clean, serializable object with only the data we need
      const requestData = {
        transcript: Array.isArray(currentTranscript) 
          ? currentTranscript.map(({ speaker, text }) => ({ speaker, text }))
          : [],
        ticket: searchedTicket || ticketData 
          ? {
              id: (searchedTicket || ticketData).id,
              status: (searchedTicket || ticketData).status,
              issueSummary: (searchedTicket || ticketData).issueSummary,
              solution: (searchedTicket || ticketData).solution,
              // Add other necessary ticket fields here
            }
          : null
      };

      const res = await fetch('http://localhost:5000/api/agent-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setSuggestions([
        "Ask if the issue started after the firmware update",
        "Run a line diagnostic test",
        "Check firmware version"
      ]);
    }
  };

  // ✅ Generate AI Solution (formerly "Generate Summary")
  const handleGenerateSummary = () => {
    fetch('http://localhost:5000/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcript, 
        ticket: searchedTicket || ticketData, 
        playbook: initialStepsData 
      })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("✅ AI Solution Received:", data);
      setWrapUp(data);
    })
    .catch(err => {
      console.error("❌ Failed to generate AI solution:", err);
      setWrapUp({
        summary: "Customer reported internet disconnects after recent firmware update...",
        disposition: "Resolved – Firmware Rollback Applied",
        notes: "Followed playbook KB-ONT-014..."
      });
    });
  };

  // ✅ Send SMS
  const handleSendSms = () => {
    setSmsSent(true);
  };

  // ✅ Search Ticket Functionality (Auto-Triggered)
  const searchTicket = () => {
    if (!transcript || transcript.length === 0) {
      console.log("No transcript to analyze.");
      return;
    }

    const fullText = transcript.map(t => t.text).join(" ").toLowerCase();
    const keywords = [
      'firmware update',
      'internet drops',
      'link flaps',
      'ont firmware',
      'router update',
      'reboot',
      'disconnect',
      'speed issue',
      'latency',
      'slow internet'
    ];

    const matchedTicket = ticketData.find(ticket => {
      const title = ticket.title.toLowerCase();
      const impact = ticket.customer_impact?.toLowerCase() || '';
      const notes = ticket.notes?.toLowerCase() || '';

      return keywords.some(kw => 
        fullText.includes(kw) && 
        (title.includes(kw) || impact.includes(kw) || notes.includes(kw))
      );
    });

    if (matchedTicket) {
      setSearchedTicket(matchedTicket);
      setSearchQuery(matchedTicket.title); // ✅ Auto-fill KB search
    } else {
      console.log("No matching ticket found in database.");
    }
  };

  // ✅ Auto-search ticket when transcript has content
  useEffect(() => {
    if (transcript.length > 0) {
      searchTicket(); // ✅ Auto-trigger on transcript change
    }
  }, [transcript]);

  // ✅ Search KB using Tavily API
  const searchKB = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/search-kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!res.ok) throw new Error('Failed to search knowledge base.');
      const data = await res.json();
      setKbResults(data.results || []);
    } catch (err) {
      alert('Failed to search knowledge base.');
      console.error(err);
    }
  };

  // ✅ Auto-search KB when ticket is found
  useEffect(() => {
    if (searchedTicket && searchQuery.trim()) {
      searchKB(); // ✅ Auto-trigger KB search when ticket updates
    }
  }, [searchedTicket, searchQuery]);

  // ✅ Auto-fill search bar when ticket changes
  useEffect(() => {
    if (searchedTicket) {
      setSearchQuery(searchedTicket.title);
    }
  }, [searchedTicket]);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#f9fafb' 
    }}>
      {/* HeaderBar */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #4f46e5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>Agent Desktop</h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.875rem',
            color: '#4b5563'
          }}>
            Agent: {crmData.agent.name} | Caller: {crmData.customer.name}
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#22c55e',
            fontWeight: '500'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              animation: 'pulse 2s infinite'
            }}></div>
            On Call • {formatTime(callDuration)}
          </div>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f3f4f6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🎙️</span> Mute
            </button>
            <button style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f3f4f6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⏸️</span> Hold
            </button>
            <button style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>📞</span> End Call
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden'
      }}>
        {/* LEFT PANEL */}
        <div style={{
          flex: '0 0 350px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          {/* CRM Profile */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>👤</span> Customer Profile
            </h4>
            <CRMPanel customer={crmData.customer} />
          </div>

          {/* Ticket Details */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🎫</span> Ticket Details
            </h4>

            {/* Show Ticket Details if Found */}
            {searchedTicket ? (
              <div style={{
                padding: '12px',
                background: '#f0fdfa',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong>ID:</strong> {searchedTicket.id}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Title:</strong> {searchedTicket.title}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor:
                      searchedTicket.status === 'Resolved' ? '#d4edda' :
                      searchedTicket.status === 'In Progress' ? '#d1ecf1' :
                      '#fff3cd',
                    color:
                      searchedTicket.status === 'Resolved' ? '#155724' :
                      searchedTicket.status === 'In Progress' ? '#0c5460' :
                      '#856404',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {searchedTicket.status}
                  </span>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Impact:</strong> {searchedTicket.customer_impact}
                </div>
                <div>
                  <strong>Notes:</strong> {searchedTicket.notes}
                </div>
              </div>
            ) : (
              <p style={{
                color: '#9ca3af',
                fontStyle: 'italic',
                fontSize: '14px',
                margin: 0
              }}>
                No matching ticket found.
              </p>
            )}
          </div>

          {/* Knowledge Base */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#be123c',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📚</span> Knowledge Base
            </h4>
            <input
              type="text"
              placeholder="Search KB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={searchKB}
              style={{
                padding: '8px 12px',
                backgroundColor: '#be123c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔍</span> Search
            </button>

            {kbResults.length > 0 && (
              <div style={{
                marginTop: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px'
              }}>
                {kbResults.map((result, i) => (
                  <div key={i} style={{
                    marginBottom: '8px',
                    padding: '8px',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    borderLeft: '3px solid #be123c'
                  }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500' }}>
                      {result.title}
                    </h5>
                    <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                      {result.snippet}
                    </p>
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        fontSize: '12px',
                        color: '#007bff',
                        textDecoration: 'none',
                        wordBreak: 'break-all'
                      }}
                    >
                      {result.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          {/* Transcript */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            flex: '2',
            minHeight: '200px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💬</span> Live Transcript
            </h4>
            <div style={{
              flexGrow: 1,
              overflowY: 'auto',
              paddingRight: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <TranscriptPane transcript={transcript} />
            </div>
            <IntentChips intents={[]} />
          </div>

          {/* AI Assistant Suggestions */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💡</span> AI Assistant Suggestions
            </h4>
            <button
              onClick={fetchSuggestions}
              style={{
                padding: '10px 14px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>✨</span> Get AI Suggestions
            </button>

            {suggestions.length > 0 && (
              <div style={{
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      color: '#d97706',
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(suggestion);
                      alert('Suggestion copied to clipboard!');
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wrap-Up */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '16px',
            flex: '1'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📝</span> Wrap-Up & Actions
            </h4>
            <NotesWrapUp
              wrapUp={wrapUp}
              sms={smsData}
              smsSent={smsSent}
              onGenerateSummary={handleGenerateSummary}
              onSendSms={handleSendSms}
              suggestions={suggestions}  
              onUpdateWrapUp={handleUpdateWrapUp}
            />
          </div>
        </div>
      </div>

      {/* Pulse Animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AgentDesktop;