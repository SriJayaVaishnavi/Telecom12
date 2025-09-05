// server/generate_caller_audio.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output directory
const dataDir = path.join(__dirname, "src", "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load transcript
const transcriptPath = path.join(__dirname, "..", "client", "src", "data", "transcript.json");
let transcript;
try {
    const transcriptContent = fs.readFileSync(transcriptPath, "utf-8");
    transcript = JSON.parse(transcriptContent);
    console.log("📜 Transcript loaded successfully");
} catch (err) {
    console.error("❌ Failed to load transcript.json:", err.message);
    process.exit(1);
}

// Filter for caller turns (assuming caller is the one who isn't the agent)
const callerTurns = transcript.filter(t => t.speaker && t.speaker.toLowerCase() !== "agent");

if (callerTurns.length === 0) {
    console.log("⚠️ No caller turns found in the transcript. Please check transcript.json");
    process.exit(0);
}

console.log(`📞 Found ${callerTurns.length} caller turns`);

// Combine all caller turns into a single paragraph
const callerText = callerTurns.map(t => t.text.trim()).join(" ");
console.log(`📝 Combined caller transcript:\n"${callerText}"`);

// PowerShell voice (you can change this if needed)
const voiceName = "Microsoft David Desktop"; 
const outputPath = path.join(dataDir, "caller_full.wav").replace(/\\/g, '\\\\');

// Clean up old caller files
const oldFiles = fs.readdirSync(dataDir).filter(f => f.startsWith("caller_") && f.endsWith(".wav"));
oldFiles.forEach(f => {
    try {
        fs.unlinkSync(path.join(dataDir, f));
        console.log(`🗑️ Removed old file: ${f}`);
    } catch (err) {
        console.error(`Error removing old file ${f}:`, err.message);
    }
});

// Escape special characters for PowerShell
const safeText = callerText.replace(/'/g, "''").replace(/\\/g, '\\\\');

// Create a PowerShell script
const psScript = `
    Add-Type -AssemblyName System.Speech;
    $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $speak.SelectVoice('${voiceName}');
    $speak.Rate = 0;
    $speak.Volume = 100;
    $speak.SetOutputToWaveFile('${outputPath}');
    $speak.Speak('${safeText}');
    $speak.Dispose();
`;

// Save the script temporarily
const tempScriptPath = path.join(dataDir, "temp_caller.ps1");
fs.writeFileSync(tempScriptPath, psScript);

// Run the PowerShell script
console.log("🎙️ Generating full caller audio...");
const cmd = `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`;

exec(cmd, (error, stdout, stderr) => {
    // Clean up temporary file
    try {
        fs.unlinkSync(tempScriptPath);
    } catch (e) {
        console.error(`⚠️ Could not delete temporary script file: ${e.message}`);
    }

    if (error) {
        console.error("❌ Failed to generate caller_full.wav:", error.message);
        return;
    }
    if (stderr) {
        console.error("⚠️ PowerShell stderr:", stderr);
    }

    console.log(`✅ Successfully generated full caller audio: ${outputPath}`);
});
