// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { spawn, exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - Allow requests from React frontend on port 3001
const corsOptions = { origin: "http://localhost:3001", credentials: true };
app.use(cors(corsOptions));
app.use(express.json());

// Create HTTP and WebSocket servers
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/transcribe' });
console.log(`✅ WebSocket server running on ws://localhost:${PORT}/transcribe`);

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

// Serve static files from the client's public directory
app.use("/audio", cors(corsOptions), express.static(SERVER_DATA_DIR));
app.use("/audio", cors(corsOptions), express.static(CLIENT_AUDIO_DIR));
app.use("/data", cors(corsOptions), express.static(CLIENT_DATA_DIR));

// Paths to JSON files (in the client's src/data)
const transcriptPath = path.join(CLIENT_DATA_DIR, "transcript.json");
const ticketPath = path.join(CLIENT_DATA_DIR, "ticket.json");

// === Helper: Mock TTS Function ===
function createMockAudioFile(text, filePath) {
  const content = `<!-- Mock TTS for: ${text} -->`;
  fs.writeFileSync(filePath, content);
  console.log(`Created mock audio file: ${filePath}`);
  return filePath;
}

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
  console.log(`✅ Saved transcript with ${data.length} entries`);
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

// ✅ API: /api/agent-suggestions
app.get("/api/agent-suggestions", async (req, res) => {
  try {
    if (!fs.existsSync(transcriptPath)) throw new Error(`transcript.json not found`);
    if (!fs.existsSync(ticketPath)) throw new Error(`ticket.json not found`);

    const transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    const ticket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));

    const prompt = `
You are an AI assistant for a telecom support agent.
Based on the conversation and ticket, provide exactly 3 short, actionable suggestions.

### Recent Transcript:
${transcript.slice(-6).map(msg => `${msg.speaker}: ${msg.text}`).join("\n")}

### Ticket Info:
- Issue: ${ticket.issue}
- Priority: ${ticket.priority}
- Device: ${ticket.deviceModel}

### Rules:
- Respond ONLY with raw JSON.
- No markdown, no explanations.
- Keep suggestions under 10 words each.

### Format:
{"suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]}
`;

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
        "Ask if the issue started after the update",
        "Run a line diagnostic test",
        "Check firmware version"
      ]
    });
  }
});

// ✅ API: /api/generate-summary
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

// ✅ Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ✅ Ensure Agent Intro TTS exists
app.get('/api/ensure-agent-intro', async (req, res) => {
  try {
    const introText = 'Thank you for calling technical support. My name is Jennifer Miller. To get started, could you please provide your date of birth and ZIP code for verification?';
    const outPath = path.join(CLIENT_AUDIO_DIR, 'agent_intro.wav');

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 44) {
      return res.json({ ok: true, file: '/audio/agent_intro.wav' });
    }

    // Use mock TTS
    createMockAudioFile(introText, outPath);

    const transcript = loadTranscript();
    transcript.push({ speaker: 'Agent', text: introText });
    saveTranscript(transcript);

    return res.json({ ok: true, file: '/audio/agent_intro.wav' });
  } catch (e) {
    console.error('ensure-agent-intro error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ NEW FLOW: Ensure Caller Transcript (from caller_full.wav ONLY)
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

// ✅ NEW FLOW: Ensure Gemini Response
app.get("/api/ensure-gemini-response", async (req, res) => {
  try {
    const replyText = "I'm transferring your case to a human representative now to ensure the quickest resolution. Please stay on the line while I connect you.";
    const outPath = path.join(CLIENT_AUDIO_DIR, 'gemini_response.wav');

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 44) {
      return res.json({ ok: true, file: '/audio/gemini_response.wav' });
    }

    // Use mock TTS
    createMockAudioFile(replyText, outPath);

    const transcript = loadTranscript();
    transcript.push({ speaker: "Agent", text: replyText });
    saveTranscript(transcript);

    res.json({ ok: true, file: '/audio/gemini_response.wav' });
  } catch (err) {
    console.error("Gemini response failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ NEW: /api/playback-complete (Handles notifications from CallAudioPlayer)
app.post('/api/playback-complete', async (req, res) => {
  try {
    const { file } = req.body || {};
    if (!file) {
      console.warn('[API] /api/playback-complete called without "file" in body');
      return res.status(400).json({ ok: false, error: 'file is required in request body' });
    }
    
    if (app.locals.lastNotifiedFile === file) {
      console.log(`[API] /api/playback-complete: Ignoring duplicate notification for ${file}`);
      return res.json({ ok: true });
    }
    app.locals.lastNotifiedFile = file;

    console.log(`[API] /api/playback-complete received for file: ${file}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('Playback complete error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ NEW: /api/save-transcript - Saves the transcript from the frontend
app.post('/api/save-transcript', async (req, res) => {
  try {
    const transcript = req.body;
    if (!Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Transcript must be an array' });
    }

    // Save the transcript to the file
    fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
    console.log(`✅ Transcript saved to ${transcriptPath}. Length: ${transcript.length}`);

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Failed to save transcript:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ REAL-TIME TRANSCRIPTION WebSocket (For live transcript)
wss.on('connection', (ws, req) => {
  console.log('🟢 New WebSocket connection established for real-time transcription');

  // Close previous connection
  if (app.locals.lastWs && app.locals.lastWs.readyState === WebSocket.OPEN) {
    console.log('🔴 Closing previous WebSocket');
    app.locals.lastWs.close();
  }
  app.locals.lastWs = ws;

  // === PER-CONNECTION STATE ===
  const conversation = [];
  // ✅ Use caller_full.wav instead of caller_1/2/3.wav
  const fullPaths = [path.join(SERVER_DATA_DIR, 'caller_full.wav')];
  const seenTexts = new Set();
  const repliedFiles = new Set();
  let hasSentIntro = false;

  // ✅ Send agent intro
  if (!hasSentIntro) {
    const introMsg = {
      speaker: 'Agent',
      text: 'Thank you for calling technical support. My name is Jennifer Miller. To get started, could you please provide your date of birth and ZIP code for verification?'
    };
    ws.send(JSON.stringify(introMsg));
    conversation.push(introMsg);
    hasSentIntro = true;
  }

  // Python script for transcription
  const pyScript = path.join(SERVER_DIR, 'transcribe_audio.py');
  if (!fs.existsSync(pyScript)) {
    ws.send(JSON.stringify({ error: `Python script not found: ${pyScript}`, type: 'system' }));
    ws.close();
    return;
  }

  let python;
  try {
    console.log(`[Python] Starting transcription process for file:`, fullPaths[0]);
    python = spawn('python', [pyScript, ...fullPaths]);
  } catch (err) {
    ws.send(JSON.stringify({ error: `Failed to start Python: ${err.message}`, type: 'system' }));
    ws.close();
    return;
  }

  // Keep alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);
  ws.on('pong', () => console.log('🏓 Pong received'));
  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log('WebSocket closed');
  });

  // Buffer for parsing
  let buffer = '';
  python.stdout.on('data', (data) => {
    buffer += data.toString();
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch (err) {
        console.error('Parse error:', err, line);
        continue;
      }

      if (msg.error) {
        console.warn('Python error:', msg);
        continue;
      }

      // ✅ Stream caller transcription
      if (msg.speaker === "caller" && msg.text) {
        const fileBase = path.basename(msg.file);
        // ✅ Check for caller_full.wav
        if (fileBase !== 'caller_full.wav') continue;

        const text = msg.text.trim();
        if (!text) continue;

        if (seenTexts.has(text)) {
          console.log(`🟨 Duplicate text skipped: ${text}`);
          continue;
        }
        seenTexts.add(text);

        const turn = { speaker: "Customer", text };
        ws.send(JSON.stringify(turn));
      }
    }
  });

  python.stderr.on('data', (data) => console.error(`Python stderr: ${data}`));

  python.on('close', (code) => {
    console.log('✅ Python process closed:', code);
    setTimeout(() => ws.close(), 1500);
  });

  // Store per-connection state
  ws.conversation = conversation;
  ws.repliedFiles = repliedFiles;
});

// ✅ NEW: Generate AI Agent Response based on full transcript
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

    // 🔧 FIX: Removed extra space in URL
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

    // ✅ Save to transcript
    transcript.push({ speaker: "Agent", text: aiResponse });
    saveTranscript(transcript);

    // ✅ Respond to client
    res.json({ ok: true, response: aiResponse });

    // ✅ Send over WebSocket (CRITICAL)
    const ws = app.locals.lastWs;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ speaker: "Agent", text: aiResponse }), (err) => {
        if (err) console.error("WebSocket send error:", err);
        else console.log("🟢 AI message sent via WebSocket:", aiResponse);
      });
    } else {
      console.warn("🟡 WebSocket not open. Cannot send AI message.");
    }

  } catch (err) {
    console.error("AI response generation failed:", err);
    res.status(500).json({ ok: false, error: err.message });

    const fallback = "I'm looking into that for you now.";
    const transcript = loadTranscript();
    transcript.push({ speaker: "Agent", text: fallback });
    saveTranscript(transcript);

    const ws = app.locals.lastWs;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ speaker: "Agent", text: fallback }));
    }
  }
});
// ✅ Start server
server.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`💡 API: http://localhost:${PORT}/api/agent-suggestions`);
  console.log(`🔊 Audio: http://localhost:${PORT}/audio/mock_call.mp3`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/transcribe`);
});