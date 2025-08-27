const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3001;

// --- REST API Endpoints to serve mock data ---
const dataDir = path.join(__dirname, 'src', 'data');

app.get('/api/crm', (req, res) => {
  res.sendFile(path.join(dataDir, 'crm.json'));
});

app.get('/api/suggestions', (req, res) => {
  res.sendFile(path.join(dataDir, 'suggestions.json'));
});

app.get('/api/steps', (req, res) => {
  res.sendFile(path.join(dataDir, 'steps.json'));
});

app.get('/api/sms', (req, res) => {
    res.sendFile(path.join(dataDir, 'sms.json'));
});

// --- WebSocket Logic for Live Transcript ---
const transcriptData = JSON.parse(fs.readFileSync(path.join(dataDir, 'transcript.json'), 'utf-8'));

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  // Simulate streaming the transcript
  transcriptData.forEach((turn, index) => {
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(turn));
      }
    }, (index + 1) * 2000); // Same delay as frontend simulation
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
