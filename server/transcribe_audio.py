\# server/transcribe_audio.py
import sys
import json
from pathlib import Path

audio_file = sys.argv[1] if len(sys.argv) > 1 else None
if not audio_file or not Path(audio_file).exists():
    print('{"error": "Audio file not found"}')
    exit(1)

# Simulate Whisper transcription (replace with real Whisper later)
# In real use, call faster-whisper or openai-whisper
import random

responses = {
    "caller_0.wav": "Hi, this is Jennifer Miller.",
    "caller_1.wav": "Sure, it's May 15th, 1985, and the zip is 10001.",
    "caller_2.wav": "Great, thanks for verifying. So what seems to be the problem?",
    "caller_3.wav": "My internet keeps dropping out. It only started after my router got that new 3.14.2 firmware update."
}

filename = Path(audio_file).name
text = responses.get(filename, "Unknown caller message")

print(json.dumps({"speaker": "caller", "text": text}))