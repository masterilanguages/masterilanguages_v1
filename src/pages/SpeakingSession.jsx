import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Play, Pause, RotateCcw, SkipForward, Volume2, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// --- Default session data (can be overridden via props/query params) ---
const DEFAULT_SEGMENTS = [
  {
    id: "line_1",
    english: "I just wanna go all over the world",
    hebrew: "אֲנִי רוֹצֶה לָלֶכֶת בְּכָל הָעוֹלָם",
    translit: "Ani rotze lalechet bechol ha'olam",
    t0: 0.0,
    t1: 4.0,
    record_start: 4.0,
    record_end: 8.0,
    hebrew_play: 8.0,
    hebrew_end: 12.0,
    repeat_start: 12.0,
    repeat_end: 16.0,
  },
  {
    id: "line_2",
    english: "I wanna feel the sun on my face",
    hebrew: "אֲנִי רוֹצֶה לְהַרְגִּישׁ אֶת הַשֶּׁמֶשׁ",
    translit: "Ani rotze lehargish et hashemesh",
    t0: 16.0,
    t1: 20.0,
    record_start: 20.0,
    record_end: 24.0,
    hebrew_play: 24.0,
    hebrew_end: 28.0,
    repeat_start: 28.0,
    repeat_end: 32.0,
  },
];

const MODES = ["auto-loop", "hands-free"];

function useMediaRecorder(onStop) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        onStop(url);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
    } catch (e) {
      console.warn("Mic access denied or unavailable:", e);
    }
  }, [onStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { startRecording, stopRecording };
}

export default function SpeakingSession() {
  const segments = DEFAULT_SEGMENTS;
  const totalDuration = segments[segments.length - 1].repeat_end;

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState("auto-loop");
  const [currentSegIdx, setCurrentSegIdx] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | english | record1 | hebrew | record2 | playback
  const [takes, setTakes] = useState({}); // { segId: [urls] }
  const [activeTakeUrl, setActiveTakeUrl] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [showHebrew, setShowHebrew] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Speak text using Web Speech API
  const speak = useCallback((text, lang = "en-US") => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  const currentSeg = segments[currentSegIdx];

  const handleTakeStop = useCallback((url) => {
    setTakes(prev => {
      const existing = prev[currentSeg.id] || [];
      return { ...prev, [currentSeg.id]: [...existing, url] };
    });
    setActiveTakeUrl(url);
  }, [currentSeg?.id]);

  const { startRecording, stopRecording } = useMediaRecorder(handleTakeStop);

  // Scheduler: tick every 100ms
  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        if (next >= currentSeg.repeat_end) {
          if (mode === "auto-loop") {
            return currentSeg.t0; // loop this segment
          } else if (mode === "hands-free") {
            // advance to next
            setCurrentSegIdx(i => Math.min(i + 1, segments.length - 1));
            return segments[Math.min(currentSegIdx + 1, segments.length - 1)].t0;
          }
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, currentSeg, mode, currentSegIdx]);

  // Determine phase from currentTime
  useEffect(() => {
    const t = currentTime;
    const seg = currentSeg;
    if (!isPlaying) return;

    if (t >= seg.t0 && t < seg.t1) {
      if (phase !== "english") {
        setPhase("english");
        setCountdown(null);
        speak(seg.english, "en-US");
      }
    } else if (t >= seg.record_start && t < seg.record_end) {
      if (phase !== "record1") {
        setPhase("record1");
        window.speechSynthesis?.cancel();
        startRecording();
        startCountdown(seg.record_end - seg.record_start);
      }
    } else if (t >= seg.hebrew_play && t < seg.hebrew_end) {
      if (phase !== "hebrew") {
        setPhase("hebrew");
        stopRecording();
        setCountdown(null);
        speak(seg.translit, "he-IL");
      }
    } else if (t >= seg.repeat_start && t < seg.repeat_end) {
      if (phase !== "record2") {
        setPhase("record2");
        window.speechSynthesis?.cancel();
        startRecording();
        startCountdown(seg.repeat_end - seg.repeat_start);
      }
    }
  }, [currentTime, isPlaying]);

  // Stop recording when phase changes away from record
  useEffect(() => {
    if (phase !== "record1" && phase !== "record2") {
      stopRecording();
    }
  }, [phase]);

  const startCountdown = (seconds) => {
    let count = Math.floor(seconds);
    setCountdown(count);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) { clearInterval(countdownRef.current); setCountdown(null); }
      else setCountdown(count);
    }, 1000);
  };

  const togglePlay = () => {
    if (!isPlaying) { setPhase("idle"); setCurrentTime(currentSeg.t0); }
    else { window.speechSynthesis?.cancel(); }
    setIsPlaying(v => !v);
  };

  const handleNextSegment = () => {
    stopRecording();
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    const next = Math.min(currentSegIdx + 1, segments.length - 1);
    setCurrentSegIdx(next);
    setCurrentTime(segments[next].t0);
    setPhase("idle");
    setIsPlaying(false);
    setActiveTakeUrl(null);
    setCountdown(null);
  };

  const handleRestart = () => {
    stopRecording();
    clearInterval(timerRef.current);
    setCurrentTime(currentSeg.t0);
    setPhase("idle");
    setIsPlaying(false);
    setActiveTakeUrl(null);
    setCountdown(null);
  };

  const progress = ((currentTime - currentSeg.t0) / (currentSeg.repeat_end - currentSeg.t0)) * 100;
  const isRecording = phase === "record1" || phase === "record2";
  const segTakes = takes[currentSeg.id] || [];

  const phaseLabel = {
    idle: "Ready",
    english: "🎵 Listen",
    record1: "🎤 Speak!",
    hebrew: "🔊 Model Hebrew",
    record2: "🎤 Repeat!",
  }[phase] || "";

  const phaseColor = {
    record1: "#ef4444",
    record2: "#ef4444",
    english: "#06b6d4",
    hebrew: "#8b5cf6",
    idle: "#6b7280",
  }[phase] || "#6b7280";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)" }}>

      {/* Header */}
      <div className="w-full max-w-md mb-6 flex items-center gap-3">
        <Link to={createPageUrl("Home")} className="text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-white font-bold text-lg flex-1">Speaking Session</h1>
        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-white text-slate-900" : "text-white/50 hover:text-white"}`}>
              {m === "auto-loop" ? "🔁 Loop" : "🤲 Free"}
            </button>
          ))}
        </div>
      </div>

      {/* Segment selector */}
      <div className="w-full max-w-md flex gap-2 mb-6 overflow-x-auto pb-1">
        {segments.map((seg, i) => (
          <button key={seg.id} onClick={() => { setCurrentSegIdx(i); setCurrentTime(seg.t0); setPhase("idle"); setIsPlaying(false); setActiveTakeUrl(null); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              currentSegIdx === i ? "bg-indigo-500 border-indigo-400 text-white" : "bg-white/10 border-white/10 text-white/50 hover:text-white"
            }`}>
            Line {i + 1}
            {(takes[seg.id]?.length || 0) > 0 && <span className="ml-1 text-green-400">●</span>}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>

        {/* Phase label */}
        <div className="flex items-center justify-center py-3 border-b border-white/10">
          <motion.span
            key={phaseLabel}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold tracking-wide"
            style={{ color: phaseColor }}
          >
            {phaseLabel || "—"}
          </motion.span>
        </div>

        {/* Lyrics */}
        <div className="px-6 py-8 text-center space-y-3">
          <motion.p key={`en-${currentSegIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-white/80 text-lg font-medium leading-relaxed">
            {currentSeg.english}
          </motion.p>

          <button onClick={() => setShowHebrew(v => !v)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
            {showHebrew ? "hide Hebrew" : "show Hebrew"}
          </button>

          <AnimatePresence>
            {showHebrew && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <p className="text-indigo-300 text-xl font-bold leading-relaxed" dir="rtl" style={{ fontFamily: "serif" }}>
                  {currentSeg.hebrew}
                </p>
                <p className="text-white/50 text-sm italic mt-1">{currentSeg.translit}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="px-6 mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${phaseColor}, ${phaseColor}aa)` }}
              animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/20 mt-1">
            <span>Listen</span><span>Speak</span><span>Model</span><span>Repeat</span>
          </div>
        </div>

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mx-6 mb-4 flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-2xl px-5 py-3 w-full justify-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <Mic className="w-5 h-5 text-red-400" />
                <span className="text-red-300 font-bold text-sm">Recording…</span>
                {countdown !== null && (
                  <span className="ml-auto text-red-400 font-mono font-bold text-lg">{countdown}</span>
                )}
              </div>
              {/* Fake waveform */}
              <div className="flex gap-1 items-end h-8">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div key={i}
                    animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                    transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.4, delay: i * 0.05 }}
                    className="w-1.5 rounded-full bg-red-400/70"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-6 pb-6">
          <button onClick={handleRestart}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>

          <button onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ background: isPlaying ? "#ef4444" : "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </button>

          <button onClick={handleNextSegment}
            disabled={currentSegIdx >= segments.length - 1}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all disabled:opacity-30">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Takes */}
      {segTakes.length > 0 && (
        <div className="w-full max-w-md mt-5 space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your Takes — Line {currentSegIdx + 1}</p>
          {segTakes.map((url, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <span className="text-white/40 text-xs font-mono">#{i + 1}</span>
              <audio src={url} controls className="flex-1 h-8" style={{ accentColor: "#8b5cf6" }} />
              {i === segTakes.length - 1 && (
                <span className="text-green-400 text-xs font-semibold">latest</span>
              )}
            </div>
          ))}

          {/* Simple feedback */}
          {segTakes.length >= 2 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mt-2">
              <p className="text-indigo-300 text-xs font-semibold mb-2">📊 Session Stats</p>
              <div className="flex gap-4">
                {[{ label: "Takes", val: segTakes.length }, { label: "Loops", val: loopCount }].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <p className="text-white font-bold text-lg">{val}</p>
                    <p className="text-white/40 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      <p className="text-white/20 text-xs text-center mt-6 max-w-xs">
        Tip: Press play and speak during the red recording windows. Your takes are saved for review.
      </p>
    </div>
  );
}