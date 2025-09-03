// server/auto_call_simulator.js
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = path.join(__dirname, "src", "data");
const clientDataDir = path.join(__dirname, "..", "client", "src", "data");

// Start with system + agent intro
let conversation = [
  {
    "speaker": "system",
    "text": "Incoming call from (917) 555-0123"
  },
  {
    "speaker": "Agent",
    "text": "Thanks for calling, you've reached technical support. My name is Yiezel Delphinus, who am I speaking with today?"
  }
];

export async function start() {
  const callerFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith("caller_") && f.endsWith(".wav"))
    .sort()
    .map(f => path.join(dataDir, f));

  for (const audioFile of callerFiles) {
    console.log(`🔊 Processing: ${audioFile}`);

    // Transcribe
    const transcript = await transcribeAudio(audioFile);
    if (!transcript) continue;

    conversation.push({ speaker: "Customer", text: transcript });
    console.log(`👤 Customer: ${transcript}`);

    // Fallback agent replies
    let agentReply;
    if (transcript.includes("Adrian Miller")) {
      agentReply = "Hey Mr. Miller. I can help you with that. To pull up your account, can I get your date of birth and billing zip code?";
    } else if (transcript.includes("May 15th")) {
      agentReply = "Great, thanks for verifying. So what seems to be the problem?";
    } else if (transcript.includes("dropping out")) {
      agentReply = "I'm seeing that this is related to a recent firmware update and persistent connection drops. Let me connect you with a specialist who can help resolve this immediately.";
    } else {
      agentReply = "Thanks for sharing that. Let me look into this for you.";
    }

    conversation.push({ speaker: "Agent", text: agentReply });
    console.log(`🎙️ Agent: ${agentReply}`);
  }

  // Save final transcript
  fs.writeFileSync(
    path.join(clientDataDir, "transcript.json"),
    JSON.stringify(conversation, null, 2)
  );

  console.log("✅ Auto-call simulation complete. Transcript saved.");
}

function transcribeAudio(audioPath) {
  return new Promise((resolve) => {
    const python = spawn('python', ['transcribe_audio.py', audioPath]);

    let output = '';
    python.stdout.on('data', (data) => output += data.toString());
    python.stderr.on('data', (data) => console.error(`Python error: ${data}`));

    python.on('close', (code) => {
      if (code !== 0) return resolve(null);
      try {
        const lines = output.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const msg = JSON.parse(lastLine);
        resolve(msg.text);
      } catch (err) {
        console.error('Parse error:', err);
        resolve(null);
      }
    });
  });
}