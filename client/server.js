// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const { getAudioDurationInSeconds } = require("get-audio-duration");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP and WebSocket servers
const server = createServer(app);
const wss = new WebSocketServer({ port: 3001 });
console.log(`✅ WebSocket server running on ws://localhost:3001`);

// ✅ Serve static files (audio) from server/src/data
const audioDataPath = path.join(__dirname, "..", "server", "src", "data");
app.use("/audio", express.static(audioDataPath));
console.log(`🔊 Audio available at http://localhost:5000/audio/caller_0.wav`);

app.use(
  cors({
    origin: "http://localhost:3000", // ✅ Match your frontend port
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

let conversationHistory = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('🟢 WebSocket client connected');
  ws.on('close', () => console.log('🔴 WebSocket client disconnected'));
});

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

async function getGeminiReply(text) {
  const prompt = `
You are a helpful and friendly call center agent named Jennifer Miller.
A customer is on the line. Respond naturally based on their last message.
Keep your responses concise and to the point.

Conversation History:
${conversationHistory.map(m => `${m.speaker}: ${m.text}`).join("\n")}

Customer: "${text}"
Agent:
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        })
      }
    );
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm having trouble connecting to my systems right now. Please hold on.";
  }
}

function transcribeAudio(audioPath) {
  const scriptPath = path.join(__dirname, '..', 'server', 'transcribe_audio.py');
  return new Promise((resolve, reject) => {
    const python = spawn('python', [scriptPath, audioPath]);
    let output = '';
    python.stdout.on('data', (data) => output += data.toString());
    python.stderr.on('data', (data) => console.error(`Python stderr: ${data}`));
    python.on('close', (code) => {
      if (code !== 0) return reject(`Transcription failed with code ${code}`);
      try {
        const result = JSON.parse(output.trim().split('\n').pop());
        resolve(result.text);
      } catch (e) {
        reject('Failed to parse transcription output');
      }
    });
  });
}

app.post('/api/start-simulation', async (req, res) => {
  console.log('🚀 Starting auto-call simulation...');
  res.json({ status: 'Simulation started' });

  conversationHistory = [];

  const agentIntro = { speaker: "Agent", text: "Thank you for calling technical support. My name is Jennifer Miller. Can I have your date of birth and ZIP code to verify your account?" };
  conversationHistory.push(agentIntro);
  broadcast(agentIntro);

  const callerAudios = ["caller_0.wav", "caller_1.wav", "caller_2.wav", "caller_3.wav"];

  for (const audioFile of callerAudios) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay

    const audioPath = path.join(audioDataPath, audioFile);
    const audioUrl = `http://localhost:${PORT}/audio/${audioFile}`;

    // 1. Play audio on client
    broadcast({ action: 'play', url: audioUrl });

    // 2. Transcribe audio
    try {
      const duration = await getAudioDurationInSeconds(audioPath);
      await new Promise(resolve => setTimeout(resolve, (duration * 1000) + 500)); // Wait for audio to play

      const transcriptText = await transcribeAudio(audioPath);
      const callerTurn = { speaker: "Customer", text: transcriptText };
      conversationHistory.push(callerTurn);
      broadcast(callerTurn);
      console.log(`👤 Customer: ${transcriptText}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Get Gemini reply
      let agentReplyText;
      if (audioFile === 'caller_2.wav') {
        agentReplyText = "I’m transferring you to a human agent who can help further.";
      } else {
        agentReplyText = await getGeminiReply(transcriptText);
      }

      const agentTurn = { speaker: "Agent", text: agentReplyText };
      conversationHistory.push(agentTurn);
      broadcast(agentTurn);
      console.log(`🎙️ Agent: ${agentReplyText}`);

      if (audioFile === 'caller_2.wav') {
        console.log('Call handoff initiated. Ending simulation.');
        break;
      }

    } catch (error) {
      console.error(`Error during simulation for ${audioFile}:`, error);
      broadcast({ speaker: "System", text: `Error processing ${audioFile}.` });
    }
  }
  console.log("✅ Auto-call simulation complete.");
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`💡 API: http://localhost:${PORT}/api/agent-suggestions`);
  console.log(`🔊 Audio: http://localhost:${PORT}/audio/caller_0.wav`);
  console.log(`📡 WebSocket: ws://localhost:3001`);
});