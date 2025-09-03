// components/CallAudioPlayer.js
import React, { useRef } from 'react';

const CallAudioPlayer = () => {
  const audioRef = useRef(null);
  const queueRef = useRef([]);

  const playAudio = (sources) => {
    queueRef.current = [...sources];
    playNext();
  };

  const playNext = () => {
    if (queueRef.current.length === 0) return;

    const nextSrc = queueRef.current.shift();
    const audio = audioRef.current;
    if (audio) {
      audio.src = nextSrc;
      const playPromise = audio.play();
      playPromise
        .then(() => console.log("🔊 Playing:", nextSrc))
        .catch(err => {
          console.error("🔇 Play failed:", err);
          playNext(); // Skip to next if failed
        });
    }
  };

  const handleEnded = () => {
    playNext();
  };

  return (
    <div style={{ display: 'none' }}>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        preload="auto"
      />
    </div>
  );
};

export default CallAudioPlayer;