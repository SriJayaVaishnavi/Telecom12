// generate_caller_full.js
import path from "path";
import { fileURLToPath } from "url";
import gTTS from "gtts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Combine the customer lines
const customerText =
  "Hi, this is Adrian Miller. My Date of birth  is May 15, 1985, and the zip is ten thousand. " +
  "My internet keeps dropping out. It only started after my router got that new three point fourteen point two firmware update.";

// Save location
const outputPath = path.join(__dirname, "src", "data", "caller_full.wav");

// Generate with a more male-like English voice
const gtts = new gTTS(customerText, "en-uk"); // UK English tends to sound deeper
gtts.save(outputPath, (err) => {
  if (err) {
    console.error("❌ Error generating caller audio:", err);
  } else {
    console.log("✅ Caller audio saved at:", outputPath);
  }
});
