import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Volume2 } from "lucide-react";

export default function SongListenPage() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const data = JSON.parse(sessionStorage.getItem("songListenData") || "{}");
  const { title, mediaUrl, transcript } = data;

  useEffect(() => {
    if (!mediaUrl) navigate(-1);
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B0F1A" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-lg">{title || "Song"}</h1>
      </div>

      {/* Player */}
      <div className="flex flex-col items-center justify-center px-6 py-10 gap-6">
        <div className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
          <Volume2 className="w-14 h-14 text-white" />
        </div>

        <h2 className="text-white text-xl font-bold text-center">{title || "Audio Track"}</h2>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
              setCurrentTime(Number(e.target.value));
            }}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-white/40 text-xs mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
        >
          {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
        </button>

        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
        />
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="px-6 pb-10 max-w-lg mx-auto w-full">
          <h3 className="text-white/60 text-sm font-semibold mb-3 uppercase tracking-wider">Lyrics / Transcript</h3>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <pre className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{transcript}</pre>
          </div>
        </div>
      )}
    </div>
  );
}