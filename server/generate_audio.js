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
    console.log("Transcript loaded successfully");
} catch (err) {
    console.error("❌ Failed to load transcript.json:", err.message);
    process.exit(1);
}

// Filter for caller turns (assuming caller is the one who isn't the agent)
const callerTurns = transcript.filter(t => t.speaker && t.speaker.toLowerCase() !== "agent");

if (callerTurns.length === 0) {
    console.log("No caller turns found in the transcript. Please check your transcript.json");
    process.exit(0);
}

console.log(`Found ${callerTurns.length} caller turns to process`);

// PowerShell voice: UK English (Hazel) for caller
const voiceName = "Microsoft David Desktop"; // Changed to a male voice for caller
let filesGenerated = 0;

// Clean up old caller files
const oldFiles = fs.readdirSync(dataDir).filter(f => f.startsWith("caller_") && f.endsWith(".wav"));
oldFiles.forEach(f => {
    try {
        fs.unlinkSync(path.join(dataDir, f));
        console.log(`Removed old file: ${f}`);
    } catch (err) {
        console.error(`Error removing old file ${f}:`, err.message);
    }
});

// Generate audio for each caller turn
callerTurns.forEach((turn, index) => {
    // Escape single quotes and backslashes for PowerShell
    const safeText = turn.text.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const outputPath = path.join(dataDir, `caller_${index}.wav`).replace(/\\/g, '\\\\');

    // Create a temporary PowerShell script file
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

    // Write the script to a temporary file
    const tempScriptPath = path.join(dataDir, `temp_${index}.ps1`);
    fs.writeFileSync(tempScriptPath, psScript);
    
    console.log(`Generating audio for caller [${index}]: "${turn.text}"`);
    
    // Execute the PowerShell script
    const cmd = `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
        // Clean up the temporary script file
        try {
            fs.unlinkSync(tempScriptPath);
        } catch (e) {
            console.error(`Warning: Could not delete temporary script file: ${e.message}`);
        }

        if (error) {
            console.error(`❌ Failed to generate caller_${index}.wav:`, error.message);
            return;
        }
        if (stderr) {
            console.error(`⚠️ PowerShell stderr for caller_${index}.wav:`, stderr);
        } else {
            filesGenerated++;
            console.log(`✅ Generated: ${outputPath} (${filesGenerated}/${callerTurns.length})`);
            
            if (filesGenerated === callerTurns.length) {
                console.log(`\n🎉 Successfully generated ${filesGenerated} caller audio files!`);
                console.log(`Output directory: ${dataDir}`);
            }
        }
    });
});