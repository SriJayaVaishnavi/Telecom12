import sys
import queue
import json
import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel

MODEL_SIZE = "base"
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

q = queue.Queue()

def callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(indata.copy())

samplerate = 16000
chunk_duration = 2  # seconds per chunk
samples_per_chunk = samplerate * chunk_duration

with sd.InputStream(samplerate=samplerate, channels=1, callback=callback):
    print(json.dumps({"speaker": "system", "text": "🎤 Listening..."}))
    sys.stdout.flush()

    buffer = np.array([], dtype=np.float32)

    while True:
        data = q.get()
        buffer = np.concatenate((buffer, data.flatten()))

        # process when enough audio is collected
        if len(buffer) >= samples_per_chunk:
            chunk = buffer[:samples_per_chunk]
            buffer = buffer[samples_per_chunk:]  # keep remainder

            # transcribe this chunk
            segments, _ = model.transcribe(chunk, beam_size=5, vad_filter=True)
            for seg in segments:
                print(json.dumps({"speaker": "user", "text": seg.text}))
                sys.stdout.flush()
