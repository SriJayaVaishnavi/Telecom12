// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP and WebSocket servers
const server = createServer(app);
const wss = new WebSocketServer({ port: 0 });
const WS_PORT = wss.address().port;
console.log(`✅ WebSocket server running on ws://localhost:${WS_PORT}`);

// ✅ Serve static files (audio) from client/src/data
const dataPath = path.join(__dirname, "src", "data");
app.use("/audio", express.static(dataPath));
console.log("🔊 Audio available at http://localhost:5000/audio/mock_call.mp3");

app.use(
  cors({
    origin: "http://localhost:3001", // ✅ Match your frontend port
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// ✅ Paths to your JSON files
const transcriptPath = path.join(__dirname, "src", "data", "transcript.json");
const ticketPath = path.join(__dirname, "src", "data", "ticket.json");

// ✅ API Endpoint: /api/agent-suggestions
app.get("/api/agent-suggestions", async (req, res) => {
  try {
    if (!fs.existsSync(transcriptPath)) {
      throw new Error(`transcript.json not found at ${transcriptPath}`);
    }
    if (!fs.existsSync(ticketPath)) {
      throw new Error(`ticket.json not found at ${ticketPath}`);
    }

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
- Do NOT use Markdown, code blocks, or explanations.
- Never include \`\`\`json or \`\`\`.
- Keep suggestions under 10 words each.

### Format:
{"suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]}
`;

    // ✅ Fix: Remove extra spaces in URL
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.4 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    let suggestions = [];

    try {
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) throw new Error("Empty response");

      let cleanedText = rawText;
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.substring(7);
      if (cleanedText.startsWith("```")) cleanedText = cleanedText.substring(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      cleanedText = cleanedText.trim();

      const parsed = JSON.parse(cleanedText);
      suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
    } catch (err) {
      console.warn("Fallback: Parsing failed", err.message);
      suggestions = [
        "Ask if the issue started after the update",
        "Run a line diagnostic test",
        "Check firmware version"
      ];
    }

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300 }
        })
      }
    );

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

// ✅ REAL-TIME TRANSCRIPTION VIA PYTHON + WHISPER
wss.on('connection', (ws) => {
  console.log('🟢 WebSocket client connected – starting real-time transcription');

  // List of 4 caller audio files
  const callerFiles = [
    'caller_0.wav',
    'caller_1.wav',
    'caller_2.wav',
    'caller_3.wav'
  ];

  let index = 0;

  function processNext() {
    if (index >= callerFiles.length) {
      console.log('✅ All caller audio files processed.');
      ws.close();
      return;
    }

    const file = callerFiles[index];
    const audioPath = path.join(dataPath, file);

    console.log(`🔊 Processing: ${audioPath}`);

    const python = spawn('python', ['transcribe_audio.py', audioPath]);

    let output = '';
    python.stdout.on('data', (data) => output += data.toString());
    python.stderr.on('data', (data) => console.error(`Python error: ${data}`));

    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Python script failed for ${file}`);
        index++;
        setTimeout(processNext, 1000);
        return;
      }

      try {
        const lines = output.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const msg = JSON.parse(lastLine);
        const speaker = msg.speaker.toLowerCase() === 'caller' ? 'Customer' : 'Agent';

        ws.send(JSON.stringify({ speaker, text: msg.text }));
        console.log(`👤 Caller: ${msg.text}`);
      } catch (err) {
        console.error('Parse error:', err);
      }

      index++;
      setTimeout(processNext, 2000); // Delay between files
    });
  }

  processNext();
});

app.post('/api/start-call', (req, res) => {
  console.log('🚀 Starting auto-call simulation...');
  import('./auto_call_simulator.js')
    .then(({ start }) => start())
    .catch(err => console.error('Failed to start simulation:', err));
  res.json({ status: 'Simulation started' });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`💡 API: http://localhost:${PORT}/api/agent-suggestions`);
  console.log(`🔊 Audio: http://localhost:${PORT}/audio/mock_call.mp3`);
  console.log(`📡 WebSocket: ws://localhost:${WS_PORT}`);
});