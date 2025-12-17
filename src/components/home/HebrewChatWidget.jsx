import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const SESSION_DURATION = 3 * 60; // 3 minutes in seconds

export default function HebrewChatWidget({ onComplete }) {
  const [state, setState] = useState("idle"); // idle, active, ended
  const [sessionId, setSessionId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('hebrewChatSession');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
        if (elapsed < SESSION_DURATION) {
          setSessionId(data.sessionId);
          setTimeRemaining(SESSION_DURATION - elapsed);
          setCurrentTurn(data.currentTurn);
          setState("active");
        } else {
          localStorage.removeItem('hebrewChatSession');
        }
      } catch (e) {}
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (state === "active" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [state, timeRemaining]);

  // Save session to localStorage
  const saveSession = (data) => {
    localStorage.setItem('hebrewChatSession', JSON.stringify({
      sessionId: data.sessionId || sessionId,
      startTime: Date.now() - ((SESSION_DURATION - timeRemaining) * 1000),
      currentTurn: data.currentTurn || currentTurn,
    }));
  };

  const startSession = async () => {
    setLoading(true);
    try {
      const result = await generateTurn(null);
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setCurrentTurn(result);
      setState("active");
      setTimeRemaining(SESSION_DURATION);
      saveSession({ sessionId: newSessionId, currentTurn: result });
    } catch (e) {
      toast.error("Failed to start session");
    }
    setLoading(false);
  };

  const generateTurn = async (previousChoice) => {
    const prompt = previousChoice 
      ? `The user chose: "${previousChoice}". Generate a brief Hebrew reply (1 short sentence), then ask a new Hebrew question with 3 different Hebrew response options. Make it conversational and natural.`
      : `Start a casual Hebrew conversation. Ask a simple Hebrew question with 3 different Hebrew response options.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}
      
      CRITICAL: Output ONLY Hebrew text. No English allowed.
      Response must be valid JSON with this exact structure:
      {
        "reply": "brief Hebrew response to user's choice (empty string if first turn)",
        "prompt": "Hebrew question",
        "options": ["Hebrew option 1", "Hebrew option 2", "Hebrew option 3"]
      }`,
      response_json_schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 }
        }
      }
    });

    return result;
  };

  const handleChoice = async (option) => {
    setLoading(true);
    try {
      const result = await generateTurn(option);
      setCurrentTurn(result);
      saveSession({ currentTurn: result });
    } catch (e) {
      toast.error("Failed to process choice");
    }
    setLoading(false);
  };

  const handleEndSession = () => {
    clearInterval(timerRef.current);
    setState("ended");
    localStorage.removeItem('hebrewChatSession');
    if (onComplete) onComplete();
  };

  const playAudio = async (text) => {
    if (playingAudio === text) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }

    setPlayingAudio(text);
    try {
      // Generate speech using browser's TTS as fallback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'he-IL';
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAudio(null);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setPlayingAudio(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetSession = () => {
    setState("idle");
    setSessionId(null);
    setTimeRemaining(SESSION_DURATION);
    setCurrentTurn(null);
    setPlayingAudio(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-400/50 transition-all"
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-white font-bold text-xl mb-2">3-Minute Hebrew Chat</h3>
            <p className="text-white/60 text-sm mb-4">Tap to start. Hebrew only.</p>
            <Button
              onClick={startSession}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Start (3:00)</>
              )}
            </Button>
          </motion.div>
        )}

        {state === "active" && currentTurn && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Hebrew Chat</h3>
              <div className="text-white/60 text-sm">
                {formatTime(timeRemaining)} left
              </div>
            </div>

            {/* AI Reply (if exists) */}
            {currentTurn.reply && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 mb-3 flex items-start gap-2"
              >
                <button
                  onClick={() => playAudio(currentTurn.reply)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/30 hover:bg-blue-500/50 flex-shrink-0"
                >
                  <Volume2 className={`w-4 h-4 text-blue-300 ${playingAudio === currentTurn.reply ? 'animate-pulse' : ''}`} />
                </button>
                <p className="text-white text-right flex-1" dir="rtl">{currentTurn.reply}</p>
              </motion.div>
            )}

            {/* Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 border border-white/20 rounded-xl p-3 mb-3 flex items-start gap-2"
            >
              <button
                onClick={() => playAudio(currentTurn.prompt)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/30 hover:bg-cyan-500/50 flex-shrink-0"
              >
                <Volume2 className={`w-4 h-4 text-cyan-300 ${playingAudio === currentTurn.prompt ? 'animate-pulse' : ''}`} />
              </button>
              <p className="text-white font-medium text-right flex-1" dir="rtl">{currentTurn.prompt}</p>
            </motion.div>

            {/* Options */}
            <div className="space-y-2">
              {currentTurn.options.map((option, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleChoice(option)}
                  disabled={loading}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-400/50 rounded-xl p-3 text-right transition-all flex items-center gap-2"
                  dir="rtl"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); playAudio(option); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 flex-shrink-0"
                  >
                    <Volume2 className={`w-4 h-4 text-white/60 ${playingAudio === option ? 'animate-pulse' : ''}`} />
                  </button>
                  <span className="text-white flex-1">{option}</span>
                </motion.button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            )}
          </motion.div>
        )}

        {state === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-white font-bold text-xl mb-2">Session Complete!</h3>
            <p className="text-white/60 text-sm mb-4">Great conversation practice!</p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4">
              <p className="text-green-400 font-bold">+50 coins earned!</p>
            </div>
            <Button
              onClick={resetSession}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}