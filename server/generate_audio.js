// server/generate_audio.js
const fs = require("fs");
const path = require("path");
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// ✅ Load transcript
const transcriptPath = path.join(__dirname, "..", "client", "src", "data", "transcript.json");
let transcript;
try {
  transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
} catch (err) {
  console.error("❌ Failed to load transcript.json:", err.message);
  process.exit(1);
}

// ✅ Output directory
const dataDir = path.join(__dirname, "src", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Clean up old files (.mp3 and .wav)
fs.readdirSync(dataDir).forEach(file => {
  if (file.endsWith('.mp3') || file.endsWith('.wav')) {
    fs.unlinkSync(path.join(dataDir, file));
  }
});

const tempFiles = [];
let filesGenerated = 0;

// Generate audio for each turn
transcript.forEach((turn, index) => {
  if (!turn.speaker || !turn.text) return;

  const speaker = turn.speaker.toLowerCase();
  const duration = Math.min(4, Math.max(1, turn.text.split(' ').length * 0.3)); // ~0.3 sec per word

  // Set voice characteristics
  const speed = speaker === "agent" ? 0.9 : 1.1; // Agent slower, customer faster
  const wavPath = path.join(dataDir, `turn_${index}.wav`);

  console.log(`🔊 Generating audio for [${turn.speaker}]: "${turn.text}" → ${wavPath}`);

  // Generate synthetic audio using silence with adjusted tempo
  ffmpeg()
    .input('anullsrc')
    .inputFormat('lavfi')
    .duration(duration)
    .audioFrequency(22050)
    .audioChannels(1)
    .audioBitrate('64k')
    .audioFilters(`atempo=${speed}`)
    .save(wavPath)
    .on('end', () => {
      console.log(`✅ Generated: ${wavPath}`);
      tempFiles[index] = wavPath;
      next();
    })
    .on('error', (err) => {
      console.error(`❌ FFmpeg error for "${turn.text}":`, err);
      tempFiles[index] = wavPath; // Still proceed
      next();
    });
});

function next() {
  filesGenerated++;
  if (filesGenerated === transcript.length) {
    // ✅ Merge all .wav files into final .wav (not .mp3)
    const output = path.join(dataDir, 'mock_call.wav'); // ← Now .wav
    const merger = ffmpeg();

    tempFiles.forEach(f => {
      if (fs.existsSync(f)) {
        merger.input(f);
      }
    });

    merger
      .mergeToFile(output)
      .on('end', () => {
        console.log(`✅ Final call audio saved as: ${output}`);
        // Cleanup temporary turn files
        tempFiles.forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
        console.log('🗑️ Temporary files cleaned up');
      })
      .on('error', (err) => {
        console.error('❌ Merge error:', err);
      });
  }
}