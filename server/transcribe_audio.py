#!/usr/bin/env python

import sys
import json
import time
import os
import torch
from pathlib import Path

def main():
    # -------------------------------
    # 1. Get audio file path
    # -------------------------------
    audio_file = sys.argv[1] if len(sys.argv) > 1 else None
    if not audio_file or not Path(audio_file).exists():
        print(json.dumps({"speaker": "system", "text": "❌ Audio file not found"}))
        return

    # -------------------------------
    # 2. Get Hugging Face token
    # -------------------------------
    hf_token = "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"
    if not hf_token:
        print(json.dumps({"speaker": "system", "text": "❌ HF_TOKEN not set. Set it via $env:HF_TOKEN='your_token' in PowerShell"}))
        return

    # -------------------------------
    # 3. Import dependencies
    # -------------------------------
    try:
        from faster_whisper import WhisperModel
        from pyannote.audio import Pipeline
    except ModuleNotFoundError as e:
        print(json.dumps({"speaker": "system", "text": f"❌ Missing package: {e.name}. Run: pip install {e.name}"}))
        return
    except Exception as e:
        print(json.dumps({"speaker": "system", "text": f"❌ Failed to import libraries: {str(e)}"}))
        return

    # -------------------------------
    # 4. Initial system messages
    # -------------------------------
    print(json.dumps({"speaker": "system", "text": "Live Transcript"}))
    print(json.dumps({"speaker": "system", "text": "incoming call from 917-555-0123."}))
    print(json.dumps({"speaker": "system", "text": "Running speaker diarization..."}))
    sys.stdout.flush()

    # -------------------------------
    # 5. Load diarization pipeline
    # -------------------------------
    try:
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )

        # ✅ Use torch.device instead of string
        device = torch.device("cpu")  # Use "cuda" if you have GPU
        pipeline.to(device)

        # Run diarization
        diarization = pipeline(audio_file)
    except Exception as e:
        error_msg = str(e).lower()
        if "gated" in error_msg or "authorization" in error_msg or "accept" in error_msg:
            print(json.dumps({"speaker": "system", "text": "⚠️ Please accept terms at https://hf.co/pyannote/speaker-diarization-3.1 and https://hf.co/pyannote/segmentation-3.0"}))
        else:
            print(json.dumps({"speaker": "system", "text": f"❌ Diarization error: {str(e)}"}))
        return

    # -------------------------------
    # 6. Assign agent/caller by first speaker
    # -------------------------------
    speaker_appearance = {}
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        if speaker not in speaker_appearance:
            speaker_appearance[speaker] = turn.start

    sorted_speakers = sorted(speaker_appearance.items(), key=lambda x: x[1])
    speaker_to_role = {}
    if sorted_speakers:
        speaker_to_role[sorted_speakers[0][0]] = "agent"
    if len(sorted_speakers) > 1:
        speaker_to_role[sorted_speakers[1][0]] = "caller"

    # -------------------------------
    # 7. Transcribe with Whisper
    # -------------------------------
    print(json.dumps({"speaker": "system", "text": "Transcribing speech..."}))
    sys.stdout.flush()

    try:
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments_gen, _ = model.transcribe(audio_file, beam_size=5)
        segments = list(segments_gen)
    except Exception as e:
        print(json.dumps({"speaker": "system", "text": f"❌ Whisper error: {str(e)}"}))
        return

    # -------------------------------
    # 8. Output each segment with speaker
    # -------------------------------
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue

        # Find dominant speaker in this segment
        speaker_votes = {}
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            overlap_start = max(segment.start, turn.start)
            overlap_end = min(segment.end, turn.end)
            overlap = max(0, overlap_end - overlap_start)
            if overlap > 0:
                speaker_votes[speaker] = speaker_votes.get(speaker, 0) + overlap

        assigned_speaker = max(speaker_votes, key=speaker_votes.get) if speaker_votes else "unknown"
        role = speaker_to_role.get(assigned_speaker, "unknown")

        if role not in ["agent", "caller"]:
            continue  # Skip unknown speakers

        # ✅ Output clean JSON
        message = {"speaker": role, "text": text}
        print(json.dumps(message))
        sys.stdout.flush()

        # Simulate real-time flow
        time.sleep((segment.end - segment.start) * 0.3)

    # -------------------------------
    # 9. Final success message
    # -------------------------------
    print(json.dumps({"speaker": "system", "text": "✅ Transcription complete."}))
    sys.stdout.flush()

# ===============================
# Run only if script is executed
# ===============================
if __name__ == "__main__":
    main()