# server/transcribe_audio.py
import sys
import json
from pathlib import Path
import os

files = sys.argv[1:]
if not files:
    print('{"error": "No audio files provided"}')
    sys.exit(1)

# Real transcription using Faster-Whisper
try:
    from faster_whisper import WhisperModel
except Exception as e:
    print(json.dumps({"error": f"Failed to import faster-whisper: {e}"}))
    sys.exit(1)

def getenv_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")

def getenv_int(name: str, default: int) -> int:
    v = os.getenv(name)
    try:
        return int(v) if v is not None else default
    except Exception:
        return default

try:
    # Env-configurable settings
    MODEL_SIZE = os.getenv("MODEL_SIZE", "base")           # tiny.en | tiny | base | small.en | small
    DEVICE = os.getenv("DEVICE", "cpu")                    # cpu | cuda
    COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "int8")       # int8 | float16 (cuda)
    LANGUAGE = os.getenv("LANGUAGE", "en")                 # en or auto
    BEAM_SIZE = getenv_int("BEAM_SIZE", 1)                  # 1 = greedy
    VAD_FILTER = getenv_bool("VAD_FILTER", True)
    CONDITION_ON_PREV = getenv_bool("CONDITION_ON_PREV", False)

    # Load model once
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

    for audio_file in files:
        if not Path(audio_file).exists():
            print(json.dumps({"error": "Audio file not found", "file": audio_file}))
            sys.stdout.flush()
            continue

        segments, info = model.transcribe(
            audio_file,
            language=None if LANGUAGE == "auto" else LANGUAGE,
            beam_size=BEAM_SIZE,
            vad_filter=VAD_FILTER,
            no_speech_threshold=0.5,
            condition_on_previous_text=CONDITION_ON_PREV
        )

        last_end = 0.0
        for seg in segments:
            s = float(getattr(seg, 'start', 0.0) or 0.0)
            e = float(getattr(seg, 'end', 0.0) or 0.0)
            txt = (getattr(seg, 'text', '') or '').strip()
            last_end = max(last_end, e)
            if txt:
                print(json.dumps({
                    "speaker": "caller",
                    "text": txt,
                    "file": str(audio_file),
                    "start": s,
                    "end": e
                }))
                sys.stdout.flush()

        # Signal file end with duration to help scheduler
        print(json.dumps({
            "event": "file_end",
            "file": str(audio_file),
            "duration": float(last_end)
        }))
        sys.stdout.flush()
except Exception as e:
    print(json.dumps({"error": f"Transcription failed: {e}"}))
    sys.exit(1)