// components/CallAudioPlayer.js
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const CallAudioPlayer = forwardRef((props, ref) => {
  const audioRef = useRef(null);

  useImperativeHandle(ref, () => ({
    playAudio(src) {
      if (audioRef.current) {
        audioRef.current.src = src;
        audioRef.current.play()
          .then(() => console.log("🔊 Playing:", src))
          .catch(err => console.error("🔇 Play failed:", err));
      }
    }
  }));

  return (
    <div style={{ display: 'none' }}>
      <audio ref={audioRef} preload="auto" />
    </div>
  );
});

export default CallAudioPlayer;