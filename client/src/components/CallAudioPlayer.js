// src/components/CallAudioPlayer.js
import React, { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';

function ts(label = '') {
  return `[AUDIO ${new Date().toISOString()}] ${label}`;
}

const CallAudioPlayer = forwardRef((props, ref) => {
  const audioRef = useRef(null);
  const queueRef = useRef([]); // Manage queue of audio files
  const playedFilesRef = useRef(new Set()); // Track already-played files

  useEffect(() => {
    console.log(ts('mounted'));
    return () => {
      console.log(ts('unmounted -> pause & clear queue'));
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      queueRef.current = [];
      playedFilesRef.current.clear();
    };
  }, []);

  // ---- Public API ----
  const playAudio = (sources) => {
    const srcs = Array.isArray(sources) ? sources : [sources];
    const newSources = srcs.filter((src) => {
      const fileName = src.split('/').pop();
      if (playedFilesRef.current.has(fileName)) {
        console.warn(ts(`skip already played: ${fileName}`));
        return false;
      }
      return true;
    });

    if (newSources.length === 0) {
      console.warn(ts('no new audio to play'));
      return;
    }

    // Add to queue
    queueRef.current = [...queueRef.current, ...newSources];
    console.log(ts('queue appended ->'), JSON.stringify(queueRef.current));
    playNext();
  };

  // ---- Notify backend ----
  const notifyBackend = async (src) => {
    try {
      const url = new URL(src, window.location.origin);
      const fileName = decodeURIComponent(url.pathname.split('/').pop() || '');
      if (!fileName) return;

      console.log(ts(`notify backend playback-complete -> ${fileName}`));

      // Notify backend of playback complete
      const r = await fetch('/api/playback-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: fileName }),
      });
      console.log(ts(`playback-complete status: ${r.status}`));

      // If caller audio finished → trigger AI agent response
      if (fileName === 'caller_full.wav') {
        console.log(ts('caller audio finished -> trigger AI agent response'));

        const res = await fetch('http://localhost:5000/api/generate-agent-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        console.log(ts(`generate-agent-response status: ${res.status}`));
        if (!res.ok) {
          console.error(ts('generate-agent-response failed'));
        } else {
          const data = await res.json();
          console.log(ts(`AI Agent Response: ${data.response}`));

          // Auto-enqueue the agent_ai_response.wav
          const aiAudioPath = '/audio/agent_ai_response.wav';
          console.log(ts(`enqueueing AI response audio -> ${aiAudioPath}`));
          playAudio(aiAudioPath);
        }
      }
    } catch (err) {
      console.error(ts('notify/AI trigger failed'), err);
    }
  };

  // ---- Playback loop ----
  const playNext = () => {
    console.log(ts(`playNext() queue len=${queueRef.current.length}`));
    if (queueRef.current.length === 0) {
      console.warn(
        ts('queue empty — no audio left, but keeping callActive/WS alive until user ends call')
      );
      return;
    }

    const src = queueRef.current[0];
    const audio = audioRef.current;
    if (!audio) {
      console.error(ts('audioRef is null'));
      return;
    }

    const onEnded = () => {
      audio.removeEventListener('ended', onEnded);
      const fileName = src.split('/').pop();
      playedFilesRef.current.add(fileName); // Mark as played
      console.log(ts(`ended -> ${fileName}`));
      notifyBackend(src);
      queueRef.current.shift();
      console.log(ts('shifted queue ->'), JSON.stringify(queueRef.current));
      playNext();
    };

    audio.addEventListener('ended', onEnded);
    audio.src = src;
    console.log(ts(`play -> ${src}`));
    audio
      .play()
      .then(() => console.log(ts(`playing: ${src}`)))
      .catch((err) => {
        console.error(ts(`play error: ${src}`), err);
        const fileName = src.split('/').pop();
        playedFilesRef.current.add(fileName); // Mark as played even on error
        notifyBackend(src);
        queueRef.current.shift();
        playNext();
      });
  };

  // ---- Expose methods ----
  useImperativeHandle(ref, () => ({
    playAudio,
    isReady: () => queueRef.current.length === 0,
    __debugDump: () => ({
      queue: [...queueRef.current],
      played: [...playedFilesRef.current],
    }),
  }));

  return <audio ref={audioRef} style={{ display: 'none' }} preload="auto" />;
});

export default CallAudioPlayer;
