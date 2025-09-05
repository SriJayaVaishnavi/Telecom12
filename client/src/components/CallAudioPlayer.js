// components/CallAudioPlayer.js
import React, { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';

const CallAudioPlayer = forwardRef((props, ref) => {
  const audioRef = useRef(null);
  const queueRef = useRef([]); // Use an array to manage the queue
  const playedFilesRef = useRef(new Set()); // Track which files have been played

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      queueRef.current = [];
      playedFilesRef.current.clear();
    };
  }, []);

  const playAudio = (sources) => {
    // Convert sources to an array and filter out files that have already been played
    const srcs = Array.isArray(sources) ? sources : [sources];
    const newSources = srcs.filter(src => {
      const fileName = src.split('/').pop();
      if (playedFilesRef.current.has(fileName)) {
        console.warn(`[Audio] Skipping already played file: ${fileName}`);
        return false;
      }
      return true;
    });

    if (newSources.length === 0) {
      console.warn("[Audio] No new audio to play");
      return;
    }

    // Add the new sources to the queue
    queueRef.current = [...queueRef.current, ...newSources];
    console.log("[Audio] Queue started:", queueRef.current);
    playNext();
  };

const notifyBackend = async (src) => {
  try {
    const url = new URL(src, window.location.origin);
    const fileName = decodeURIComponent(url.pathname.split('/').pop() || '');
    if (!fileName) return;

    // Notify playback complete
    await fetch('/api/playback-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: fileName })
    });
    console.log(`✅ Notified backend: ${fileName}`);

    // If this was the caller's audio (e.g., caller_full.wav), trigger AI response
    if (fileName === 'caller_full.wav') {
      console.log('🎤 Caller audio finished. Requesting AI agent response...');

      const res = await fetch('http://localhost:5000/api/generate-agent-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // optional: send context
      });

      if (!res.ok) {
        console.error('Failed to generate AI response');
      } else {
        const data = await res.json();
        console.log('🤖 AI Agent Response:', data.response);
      }
    }
  } catch (err) {
    console.error('Notify or AI trigger failed:', err);
  }
};

  const playNext = () => {
    if (queueRef.current.length === 0) return;

    const src = queueRef.current[0];
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      audio.removeEventListener('ended', onEnded);
      const fileName = src.split('/').pop();
      playedFilesRef.current.add(fileName); // Mark as played
      notifyBackend(src);
      queueRef.current.shift();
      playNext();
    };

    audio.addEventListener('ended', onEnded);
    audio.src = src;
    audio.play().catch(err => {
      console.error('Play error:', err);
      const fileName = src.split('/').pop();
      playedFilesRef.current.add(fileName); // Mark as played even on error
      notifyBackend(src);
      queueRef.current.shift();
      playNext();
    });
  };

  useImperativeHandle(ref, () => ({
    playAudio,
    isReady: () => queueRef.current.length === 0
  }));

  return <audio ref={audioRef} style={{ display: 'none' }} preload="auto" />;
});

export default CallAudioPlayer;