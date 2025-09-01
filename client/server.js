// server.js
// Run this from your client/ folder: node server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP and WebSocket servers
const server = createServer(app);
const wss = new WebSocketServer({ port: 3001 });
console.log("✅ WebSocket server running on ws://localhost:3001");

// ✅ Serve static files (audio) from client/src/data
const dataPath = path.join(__dirname, "src", "data");
app.use("/audio", express.static(dataPath));
console.log("🔊 Audio available at http://localhost:5000/audio/mock_call.mp3");

app.use(
  cors({
    origin: "http://localhost:3002", // ✅ Match your React app's port
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// ✅ Simulate real-time transcription via WebSocket
setInterval(() => {
  const mockMessages = [
    { speaker: "Customer", text: "Hi, my internet keeps dropping every few minutes." },
    { speaker: "Agent", text: "Thanks, let me run a diagnostic." },
    { speaker: "Customer", text: "It started after last night's update." },
    { speaker: "Agent", text: "I'll check the line stats." },
  ];
  const msg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}, 3000); // Send every 3 seconds

// ✅ Paths to your JSON files
const transcriptPath = path.join(__dirname, "src", "data", "transcript.json");
const ticketPath = path.join(__dirname, "src", "data", "ticket.json");

// ✅ API Endpoint: /api/agent-suggestions
app.get("/api/agent-suggestions", async (req, res) => {
  try {
    // Check if required files exist
    if (!fs.existsSync(transcriptPath)) {
      throw new Error(`transcript.json not found at ${transcriptPath}`);
    }
    if (!fs.existsSync(ticketPath)) {
      throw new Error(`ticket.json not found at ${ticketPath}`);
    }

    // Read and parse transcript and ticket
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    const ticket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));

    // Prepare prompt for Gemini
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

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.4,
            topP: 0.95,
          },
        }),
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
      // Extract response text
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) throw new Error("Empty or missing response from Gemini");

      console.log("Gemini raw response:", rawText); // Debug log

      // ✅ Clean the response (remove ```json and ```)
      let cleanedText = rawText;
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      console.log("Cleaned JSON:", cleanedText); // Debug log

      // Parse cleaned JSON
      const parsed = JSON.parse(cleanedText);
      suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3) // Limit to 3
        : [];
    } catch (parseError) {
      console.warn("Failed to parse Gemini response:", parseError.message);
      console.log("Using fallback suggestions.");
      suggestions = [
        "Ask if the issue started after the update",
        "Run a line diagnostic test",
        "Check firmware version"
      ];
    }

    // ✅ Send suggestions to frontend
    res.json({ suggestions });
  } catch (err) {
    console.error("Error in /api/agent-suggestions:", err.message);
    res.status(500).json({
      error: "Failed to fetch suggestions",
      suggestions: [
        "Ask if the issue started after the update",
        "Run a line diagnostic test",
        "Check firmware version"
      ],
    });
  }
});
// In server.js — Add this route below /api/agent-suggestions
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${await response.text()}`);
    }

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
// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`💡 API: http://localhost:${PORT}/api/agent-suggestions`);
  console.log(`🔊 Audio: http://localhost:${PORT}/audio/mock_call.mp3`);
  console.log(`📡 WebSocket: ws://localhost:3001`);
});