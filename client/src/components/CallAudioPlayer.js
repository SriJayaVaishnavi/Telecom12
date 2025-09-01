// src/components/CallAudioPlayer.js
import React, { useRef } from 'react';

const CallAudioPlayer = React.forwardRef((props, ref) => {
  const audioRef = useRef(null);

  const playAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      const playPromise = audio.play();
      playPromise
        .then(() => console.log("🎧 Audio playing"))
        .catch(err => console.error("🔇 Play failed:", err));
    }
  };

  React.useImperativeHandle(ref, () => ({ playAudio }));

  return (
    <div style={{ display: 'none' }}>
      <audio
        ref={audioRef}
        src="http://localhost:5000/audio/mock_call.mp3"
        preload="auto"
      />
    </div>
  );
});

export default CallAudioPlayer;