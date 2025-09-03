import sys
import json
from pathlib import Path
from faster_whisper import WhisperModel

# Initialize the Whisper model
# Using a smaller model for speed, can be changed to "large-v2" for accuracy
MODEL_SIZE = "base.en"
try:
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
except Exception as e:
    print(json.dumps({"error": f"Failed to load Whisper model: {e}"}))
    sys.exit(1)

def transcribe(audio_path):
    """
    Transcribes a given audio file using the Whisper model.
    """
    try:
        segments, _ = model.transcribe(audio_path, beam_size=5)
        transcription = " ".join([seg.text for seg in segments])
        return transcription.strip()
    except Exception as e:
        return f"Error during transcription: {e}"

if __name__ == "__main__":
    # Check for audio file argument
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)

    audio_file = sys.argv[1]
    if not Path(audio_file).exists():
        print(json.dumps({"error": f"Audio file not found: {audio_file}"}))
        sys.exit(1)

    # Transcribe the audio file
    transcribed_text = transcribe(audio_file)

    # Output the result as JSON
    result = {
        "speaker": "Customer",  # Assuming the audio is always from the customer
        "text": transcribed_text
    }
    print(json.dumps(result))