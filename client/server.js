// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");

// Clear session storage on server start
const clearSessionStorage = () => {
  try {
    // These are the keys we use in memoryModules.js
    const sessionKeys = ['ticketMemoryModule', 'kbMemoryModule'];
    sessionKeys.forEach(key => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    });
    console.log(' Session storage cleared on server start');
  } catch (e) {
    console.warn('Could not clear session storage:', e.message);
  }
};

// Clear session storage when this file is required
clearSessionStorage();

// Install: npm install node-fetch@2
const fetch = require('node-fetch');
global.fetch = fetch; // Enable global fetch for all routes

// Load environment variables
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TAVILY_API_KEY) {
  console.error(' TAVILY_API_KEY is not set in .env file');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - Allow requests from any origin during development
const corsOptions = { 
  origin: true, // Allow any origin
  credentials: true 
};
app.use(cors(corsOptions));
app.use(express.json());

// Create HTTP and WebSocket servers
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/transcribe' });
console.log(` WebSocket server running on ws://localhost:${PORT}/transcribe`);

// === CORRECTED File Paths ===
const SERVER_DIR = path.join(__dirname, '..', 'server');
const SERVER_DATA_DIR = path.join(SERVER_DIR, 'src', 'data');

const CLIENT_DIR = __dirname;
const CLIENT_PUBLIC_DIR = path.join(CLIENT_DIR, 'public');
const CLIENT_AUDIO_DIR = path.join(CLIENT_PUBLIC_DIR, 'audio');
const CLIENT_DATA_DIR = path.join(CLIENT_DIR, 'src', 'data');

// Create the directories if they don't exist
[CLIENT_PUBLIC_DIR, CLIENT_AUDIO_DIR, CLIENT_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy gemini_response.wav to server/src/data if it exists
const sourceGemini = path.join(CLIENT_PUBLIC_DIR, 'audio', 'gemini_response.wav');
const targetGemini = path.join(SERVER_DATA_DIR, 'gemini_response.wav');
if (fs.existsSync(sourceGemini) && !fs.existsSync(targetGemini)) {
  fs.copyFileSync(sourceGemini, targetGemini);
  console.log(` Copied gemini_response.wav to ${targetGemini}`);
}

// Serve static files
app.use("/audio", cors(corsOptions), express.static(SERVER_DATA_DIR));
app.use("/audio", cors(corsOptions), express.static(CLIENT_AUDIO_DIR));
app.use("/data", cors(corsOptions), express.static(CLIENT_DATA_DIR));

// Paths to JSON files
const transcriptPath = path.join(CLIENT_DATA_DIR, "transcript.json");
const ticketPath = path.join(CLIENT_DATA_DIR, "ticket.json");

// === Helper: Load/Save Transcript ===
function loadTranscript() {
  if (fs.existsSync(transcriptPath)) {
    try {
      return JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    } catch (err) {
      console.warn("Failed to parse transcript.json, using empty array");
      return [];
    }
  }
  return [];
}

function saveTranscript(data) {
  fs.writeFileSync(transcriptPath, JSON.stringify(data, null, 2));
  console.log(` Saved transcript with ${data.length} entries`);
}

// === Helper: Run Whisper transcription on caller_full.wav ===
function runWhisper() {
  return new Promise((resolve, reject) => {
    const CALLER_FULL_FILE = path.join(SERVER_DATA_DIR, "caller_full.wav");
    const pyScript = path.join(SERVER_DIR, "transcribe_audio.py");

    console.log(`Looking for audio file at: ${CALLER_FULL_FILE}`);
    console.log(`Looking for Python script at: ${pyScript}`);

    if (!fs.existsSync(CALLER_FULL_FILE)) {
      return reject(new Error(`Audio file not found: ${CALLER_FULL_FILE}`));
    }
    if (!fs.existsSync(pyScript)) {
      return reject(new Error(`Python script not found: ${pyScript}`));
    }

    const py = spawn("python", [pyScript, CALLER_FULL_FILE]);
    let transcript = "";

    py.stdout.on("data", (data) => {
      transcript += data.toString();
    });

    py.stderr.on("data", (err) => {
      console.error("Python error:", err.toString());
    });

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}`));
      } else {
        resolve(transcript.trim());
      }
    });
  });
}

// Proxy Tavily API
app.post('/api/search-kb', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  if (!TAVILY_API_KEY) {
    return res.status(500).json({ error: "Tavily API key not set" });
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API Error:', errorText);
      return res.status(500).json({ error: 'Failed to fetch from Tavily' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Tavily Proxy Error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// API: /api/agent-suggestions (POST with real ticket matching)
app.post("/api/agent-suggestions", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: "Valid transcript is required" });
    }

    // Load ticket.json (array of tickets)
    if (!fs.existsSync(ticketPath)) {
      return res.status(500).json({ error: "ticket.json not found" });
    }

    const allTickets = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));
    if (!Array.isArray(allTickets) || allTickets.length === 0) {
      return res.status(500).json({ error: "No tickets available" });
    }

    // Find the current ticket (e.g., first "Open" or "In Progress")
    const currentTicket = allTickets.find(t => 
      t.status === "Open" || t.status === "In Progress"
    ) || allTickets[0]; // fallback to first

    const { id, title, status, customer_impact, notes } = currentTicket;

    const prompt = `
You are an AI assistant for a telecom support agent.
Based on the conversation and the current ticket, provide exactly 3 short, actionable suggestions.

### Recent Transcript:
${transcript.slice(-6).map(msg => `${msg.speaker}: ${msg.text}`).join("\n")}

### Current Ticket:
- ID: ${id}
- Title: ${title}
- Status: ${status}
- Customer Impact: ${customer_impact}
- Notes: ${notes}

### Rules:
- Respond ONLY with raw JSON.
- No markdown, no explanations.
- Keep suggestions under 10 words each.
- Be concise and action-oriented.

### Format:
{"suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]}
`;

    // Fixed URL: Removed space before :generateContent
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.4 }
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) throw new Error("Empty response");

    let cleanedText = rawText;
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.substring(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.substring(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];

    res.json({ suggestions });
  } catch (err) {
    console.error("Error in /api/agent-suggestions:", err.message);
    res.status(500).json({
      suggestions: [
        "Ask if the issue started after the firmware update",
        "Run a line diagnostic test",
        "Check firmware version"
      ]
    });
  }
});

// API: /api/generate-summary
app.post("/api/generate-summary", async (req, res) => {
  try {
    const { transcript, ticket, playbook } = req.body;
    if (!transcript || !ticket) {
      return res.status(400).json({ error: "Transcript and ticket are required" });
    }

    const lastMessages = transcript.slice(-8).map(m => `${m.speaker}: ${m.text}`).join("\n");
    const issue = ticket.issue;
    const deviceModel = ticket.deviceModel;

    const prompt = `
You are an AI assistant for a telecom support agent.
Generate a professional wrap-up for a resolved case.

### Context:
- Issue: ${issue}
- Device: ${deviceModel}

### Recent Conversation:
${lastMessages}

### Actions Taken:
- ${playbook?.steps?.filter(s => s.status === 'completed').map(s => s.action).join(", ")}

### Rules:
- Respond with valid JSON only.
- No markdown or code blocks.
- Keep summary under 150 words.

### Format:
{
  "summary": "Brief summary of issue and fix.",
  "disposition": "Resolved – Firmware Rollback Applied",
  "notes": "Technical details and confirmation."
}
`;

    // Fixed URL: Using gemini-1.5-pro model
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300 }
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    let cleanedText = rawText;
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.substring(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.substring(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    cleanedText = cleanedText.trim();

    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (err) {
    console.error("Error in /api/generate-summary:", err.message);
    res.status(500).json({
      summary: "Customer reported internet disconnects after recent firmware update (v3.14.2). A line test confirmed link flaps, consistent with a known regression issue. Executed a firmware rollback to the previous stable version (v3.12.9).",
      disposition: "Resolved – Firmware Rollback Applied",
      notes: "Followed playbook KB-ONT-014 to resolve the issue. Post-rollback line test showed a stable connection. Customer confirmed service restoration."
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Ensure Agent Intro TTS exists
app.get('/api/ensure-agent-intro', async (req, res) => {
  try {
    const introText = 'Thank you for calling technical support. My name is Jennifer Miller. To get started, could you please provide your date of birth and ZIP code for verification?';
    const outPath = path.join(CLIENT_AUDIO_DIR, 'agent_intro.wav');

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 44) {
      return res.json({ ok: true, file: '/audio/agent_intro.wav' });
    }

    const content = `<!-- Mock TTS for: ${introText} -->`;
    fs.writeFileSync(outPath, content);
    console.log(`Created mock audio file: ${outPath}`);

    const transcript = loadTranscript();
    transcript.push({ speaker: 'Agent', text: introText });
    saveTranscript(transcript);

    return res.json({ ok: true, file: '/audio/agent_intro.wav' });
  } catch (e) {
    console.error('ensure-agent-intro error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// NEW FLOW: Ensure Caller Transcript
app.get("/api/ensure-caller-transcript", async (req, res) => {
  try {
    const transcript = loadTranscript();
    const hasCallerText = transcript.some(t => t.speaker === "Customer");

    if (!hasCallerText) {
      const transcriptText = await runWhisper();
      if (transcriptText) {
        transcript.push({ speaker: "Customer", text: transcriptText });
        saveTranscript(transcript);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Caller transcription failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Ensure Gemini Response (only serve file, no text injection)
app.get("/api/ensure-gemini-response", async (req, res) => {
  try {
    const outPath = path.join(CLIENT_AUDIO_DIR, 'gemini_response.wav');
    if (fs.existsSync(outPath)) {
      return res.json({ ok: true, file: '/audio/gemini_response.wav' });
    }
    res.status(404).json({ ok: false, error: 'gemini_response.wav not found' });
  } catch (err) {
    console.error("Gemini response failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// NEW: Trigger transcription of gemini_response.wav
app.post('/api/transcribe-agent-response', (req, res) => {
  const GEMINI_FILE = path.join(SERVER_DATA_DIR, 'gemini_response.wav');
  const pyScript = path.join(SERVER_DIR, 'transcribe_audio.py');

  if (!fs.existsSync(GEMINI_FILE)) {
    console.warn(' gemini_response.wav not found for transcription');
    return res.json({ ok: true });
  }

  console.log(' Starting transcription of gemini_response.wav...');
  const python = spawn('python', [pyScript, GEMINI_FILE]);
  let buffer = '';

  python.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    lines.forEach(line => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        if (msg.speaker && msg.text) {
          const text = msg.text.trim();
          if (text && app.locals.lastWs && app.locals.lastWs.readyState === WebSocket.OPEN) {
            app.locals.lastWs.send(JSON.stringify({
              speaker: 'Agent',
              text
            }));
            console.log(` [Agent] ${text}`);
          }
        }
      } catch (e) {
        console.error('Parse error in gemini stream:', e);
      }
    });
  });

  python.stderr.on('data', (d) => console.error('Gemini transcription error:', d.toString()));
  python.on('close', () => console.log(' gemini_response.wav transcription complete'));

  res.json({ ok: true });
});

// /api/playback-complete
app.post('/api/playback-complete', async (req, res) => {
  try {
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ ok: false, error: 'file required' });
    if (app.locals.lastNotifiedFile === file) return res.json({ ok: true });
    app.locals.lastNotifiedFile = file;

    console.log(`[API] Playback complete: ${file}`);

    // When caller finishes, trigger AI response
    if (file === 'caller_full.wav') {
      fetch('http://localhost:5000/api/generate-agent-response', {
        method: 'POST'
      }).catch(console.error);
    }

    // When gemini_response.wav finishes, transcribe it
    if (file === 'gemini_response.wav') {
      fetch('http://localhost:5000/api/transcribe-agent-response', {
        method: 'POST'
      }).catch(console.error);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// /api/save-transcript
app.post('/api/save-transcript', async (req, res) => {
  try {
    const transcript = req.body;
    if (!Array.isArray(transcript)) return res.status(400).json({ error: 'Array required' });
    fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
    console.log(` Transcript saved. Length: ${transcript.length}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(' Failed to save transcript:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// REAL-TIME TRANSCRIPTION WebSocket
wss.on('connection', (ws, req) => {
  console.log(' New WebSocket connection established');

  if (app.locals.lastWs && app.locals.lastWs.readyState === WebSocket.OPEN) {
    app.locals.lastWs.close();
  }
  app.locals.lastWs = ws;

  const seenTexts = new Set();
  let hasSentIntro = false;

  const CALLER_FILE = path.join(SERVER_DATA_DIR, 'caller_full.wav');
  const pyScript = path.join(SERVER_DIR, 'transcribe_audio.py');

  if (!fs.existsSync(pyScript)) {
    ws.send(JSON.stringify({ error: `Python script not found: ${pyScript}` }));
    return ws.close();
  }

  // Send intro
  if (!hasSentIntro) {
    ws.send(JSON.stringify({
      speaker: 'Agent',
      text: 'Thank you for calling technical support. My name is Jennifer Miller. To get started, could you please provide your date of birth and ZIP code for verification?'
    }));
    hasSentIntro = true;
  }

  // Ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);
  ws.on('pong', () => console.log(' Pong received'));
  ws.on('close', () => clearInterval(pingInterval));

  // === Transcribe caller_full.wav only ===
  if (!fs.existsSync(CALLER_FILE)) {
    ws.send(JSON.stringify({ error: `caller_full.wav not found` }));
    return ws.close();
  }

  const python = spawn('python', [pyScript, CALLER_FILE]);
  let buffer = '';

  python.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    lines.forEach(line => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        if (msg.speaker && msg.text) {
          const text = msg.text.trim();
          if (text && !seenTexts.has(text)) {
            seenTexts.add(text);
            ws.send(JSON.stringify({ speaker: "Customer", text }));
          }
        }
      } catch (e) {
        console.error('Parse error (caller):', e);
      }
    });
  });

  python.stderr.on('data', (d) => console.error('Py err:', d.toString()));
  python.on('close', () => console.log(' caller_full.wav transcription done'));
});

// NEW: Generate AI Agent Response (only triggers audio, no text injection)
app.post("/api/generate-agent-response", async (req, res) => {
  try {
    const transcript = loadTranscript();
    if (transcript.length === 0) {
      return res.status(400).json({ error: "Transcript is empty" });
    }

    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage.speaker !== "Customer") {
      return res.json({ ok: true, response: null });
    }

    const prompt = `
You are Jennifer, a professional telecom support agent.
Based on the customer's message and full conversation, generate a concise, empathetic, and technical response.

### Rules:
- Respond as the agent in first person.
- Keep it under 2 sentences.
- Use plain language, no markdown.
- Respond ONLY with raw JSON.

### Format:
{"response": "Thank you for confirming. I've run a diagnostic test and found link flaps..."}

### Transcript:
${transcript.map(msg => `${msg.speaker}: ${msg.text}`).join("\n")}
`;

    // Fixed URL: Using gemini-1.5-pro model
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
      })
    });

    if (!geminiRes.ok) throw new Error(await geminiRes.text());

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) throw new Error("Empty Gemini response");

    let cleanedText = rawText;
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.substring(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.substring(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    const aiResponse = parsed.response;

    // Do NOT save to transcript or send via WebSocket
    // Real transcription will come from gemini_response.wav audio

    res.json({ ok: true, response: aiResponse });
  } catch (err) {
    console.error("AI response generation failed:", err);
    res.json({ ok: true, response: "I'm looking into that for you now." });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(` Backend server running on http://localhost:${PORT}`);
  console.log(` API: http://localhost:${PORT}/api/agent-suggestions`);
  console.log(` Audio: http://localhost:${PORT}/audio/mock_call.mp3`);
  console.log(` WebSocket: ws://localhost:${PORT}/transcribe`);
});