import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { languageLabel, isRTLLanguage } from "@/lib/language";

const SESSION_DURATION = 3 * 60; // 3 minutes in seconds

// Map target language -> BCP-47 voice tag for SpeechSynthesis.
const SPEECH_LANG = {
  hebrew: 'he-IL',
  english: 'en-US',
  spanish: 'es-ES',
  french: 'fr-FR',
  portuguese: 'pt-PT',
  italian: 'it-IT',
};

export default function HebrewChatWidget({ onComplete, language }) {
  // Target language for prompts/TTS/display. Falls back to Hebrew so existing
  // callers (which pass no `language`) behave exactly as before.
  const lang = language || 'hebrew';
  const langLabel = languageLabel(lang);
  const rtl = isRTLLanguage(lang);
  const speechLang = SPEECH_LANG[String(lang).toLowerCase()] || 'he-IL';
  const [state, setState] = useState("idle"); // idle, active, ended
  const [sessionId, setSessionId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showTransliteration, setShowTransliteration] = useState(false);
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
      ? `The user chose: "${previousChoice}".

      Analyze the emotional context of their choice and respond with appropriate subtle emotion.
      Generate a brief ${langLabel} reply (1 short sentence) matching the emotion, then ask a new ${langLabel} question with 3 different ${langLabel} response options.

      Emotion guidelines:
      - warm: positive sharing, friendly topic
      - excited: interesting news, achievement
      - curious: thought-provoking response
      - empathetic: difficulty, challenge mentioned
      - neutral: factual, straightforward
      - amused: lighthearted, funny

      Keep it conversational and natural.`
      : `Start a casual ${langLabel} conversation with warm, welcoming tone. Ask a simple ${langLabel} question with 3 different ${langLabel} response options.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}

      CRITICAL: Output ONLY ${langLabel} text. No English allowed.
      Response must be valid JSON with this exact structure:
      {
        "reply": "brief ${langLabel} response to user's choice (empty string if first turn)",
        "reply_transliteration": "transliteration of reply (empty if first turn)",
        "emotion": "warm | excited | curious | empathetic | neutral | amused",
        "prompt": "${langLabel} question",
        "prompt_transliteration": "transliteration of question",
        "options": [
          {"text": "${langLabel} option 1", "transliteration": "transliteration 1"},
          {"text": "${langLabel} option 2", "transliteration": "transliteration 2"},
          {"text": "${langLabel} option 3", "transliteration": "transliteration 3"}
        ]
      }

      Emotion must match the conversational context. Be subtle, adult, natural.`,
      response_json_schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          reply_transliteration: { type: "string" },
          emotion: { type: "string", enum: ["warm", "excited", "curious", "empathetic", "neutral", "amused"] },
          prompt: { type: "string" },
          prompt_transliteration: { type: "string" },
          options: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                text: { type: "string" },
                transliteration: { type: "string" }
              }
            }, 
            minItems: 3, 
            maxItems: 3 
          }
        }
      }
    });

    return result;
  };

  const handleChoice = async (option) => {
    setLoading(true);
    try {
      const selectedText = typeof option === 'string' ? option : option.text;
      const result = await generateTurn(selectedText);
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

  const playAudio = async (text, emotion = 'neutral') => {
    if (playingAudio === text) {
      window.speechSynthesis.cancel();
      setPlayingAudio(null);
      return;
    }

    setPlayingAudio(text);
    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      
      // Apply emotion-based prosody adjustments
      const emotionStyles = {
        warm: { rate: 0.9, pitch: 1.1, volume: 0.9 },
        excited: { rate: 1.1, pitch: 1.2, volume: 1.0 },
        curious: { rate: 0.95, pitch: 1.15, volume: 0.95 },
        empathetic: { rate: 0.8, pitch: 0.95, volume: 0.85 },
        neutral: { rate: 0.9, pitch: 1.0, volume: 0.9 },
        amused: { rate: 1.0, pitch: 1.1, volume: 0.95 }
      };
      
      const style = emotionStyles[emotion] || emotionStyles.neutral;
      utterance.rate = style.rate;
      utterance.pitch = style.pitch;
      utterance.volume = style.volume;
      
      utterance.onend = () => setPlayingAudio(null);
      utterance.onerror = () => setPlayingAudio(null);
      
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

  const addWordToBackpack = (hebrewWord, transliteration, meaning = "") => {
    const existing = JSON.parse(localStorage.getItem('pendingBackpackWords') || '[]');
    const alreadyExists = existing.find(w => w.word?.toLowerCase() === transliteration?.toLowerCase());
    if (alreadyExists) {
      toast.info("Already in your list!");
      return;
    }
    existing.push({ word: transliteration, meaning, hebrew: hebrewWord });
    localStorage.setItem('pendingBackpackWords', JSON.stringify(existing));
    toast.success(`"${transliteration}" added to backpack! 🎒`);
  };

  const addSentenceToBackpack = (hebrewText, transliteration) => {
    const existing = JSON.parse(localStorage.getItem('pendingBackpackWords') || '[]');
    existing.push({ word: transliteration || hebrewText, meaning: "Full sentence", hebrew: hebrewText });
    localStorage.setItem('pendingBackpackWords', JSON.stringify(existing));
    toast.success("Sentence added to backpack! 🎒");
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
            <h3 className="text-white font-bold text-xl mb-2">3-Minute {langLabel} Chat</h3>
            <p className="text-white/60 text-sm mb-4">Tap to start. {langLabel} only.</p>
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
              <h3 className="text-white font-bold text-lg">{langLabel} Chat</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    showTransliteration 
                      ? "bg-cyan-500/30 text-cyan-300" 
                      : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}
                >
                  ABC
                </button>
                <div className="text-white/60 text-sm">
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>

            {/* AI Reply (if exists) */}
            {currentTurn.reply && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 mb-3"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => playAudio(currentTurn.reply, currentTurn.emotion)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/30 hover:bg-blue-500/50 flex-shrink-0"
                  >
                    <Volume2 className={`w-4 h-4 text-blue-300 ${playingAudio === currentTurn.reply ? 'animate-pulse' : ''}`} />
                  </button>
                  <div className={`flex-1 ${rtl ? 'text-right' : 'text-left'}`}>
                    <div className={`flex flex-wrap gap-1 ${rtl ? 'justify-end' : 'justify-start'}`} dir={rtl ? 'rtl' : 'ltr'}>
                      {currentTurn.reply.split(' ').map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => addWordToBackpack(word, currentTurn.reply_transliteration?.split(' ')[idx] || word)}
                          className="hover:bg-blue-500/30 px-1 rounded transition-colors"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                    {showTransliteration && currentTurn.reply_transliteration && (
                      <p className="text-blue-300/60 text-xs mt-1">{currentTurn.reply_transliteration}</p>
                    )}
                    <button
                      onClick={() => addSentenceToBackpack(currentTurn.reply, currentTurn.reply_transliteration)}
                      className="text-blue-400 text-[10px] hover:underline mt-1"
                    >
                      + Save full sentence
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 border border-white/20 rounded-xl p-3 mb-3"
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => playAudio(currentTurn.prompt, 'curious')}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/30 hover:bg-cyan-500/50 flex-shrink-0"
                >
                  <Volume2 className={`w-4 h-4 text-cyan-300 ${playingAudio === currentTurn.prompt ? 'animate-pulse' : ''}`} />
                </button>
                <div className={`flex-1 ${rtl ? 'text-right' : 'text-left'}`}>
                  <div className={`flex flex-wrap gap-1 ${rtl ? 'justify-end' : 'justify-start'}`} dir={rtl ? 'rtl' : 'ltr'}>
                    {currentTurn.prompt.split(' ').map((word, idx) => (
                      <button
                        key={idx}
                        onClick={() => addWordToBackpack(word, currentTurn.prompt_transliteration?.split(' ')[idx] || word)}
                        className="hover:bg-white/20 px-1 rounded transition-colors font-medium"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                  {showTransliteration && currentTurn.prompt_transliteration && (
                    <p className="text-white/40 text-xs mt-1">{currentTurn.prompt_transliteration}</p>
                  )}
                  <button
                    onClick={() => addSentenceToBackpack(currentTurn.prompt, currentTurn.prompt_transliteration)}
                    className="text-cyan-400 text-[10px] hover:underline mt-1"
                  >
                    + Save full sentence
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Options */}
            <div className="space-y-2">
              {currentTurn.options.map((option, idx) => {
                const optionText = typeof option === 'string' ? option : option.text;
                const optionTranslit = typeof option === 'string' ? '' : option.transliteration;
                
                // Extract only first emoji and first word
                const firstEmoji = optionText.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || '';
                const textWithoutEmoji = optionText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
                const firstWord = textWithoutEmoji.split(/\s+/)[0] || textWithoutEmoji;
                const simplifiedText = (firstEmoji + ' ' + firstWord).trim();
                
                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleChoice(option)}
                    disabled={loading}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-400/50 rounded-xl p-3 transition-all"
                  >
                    <div className="flex items-center gap-2" dir={rtl ? 'rtl' : 'ltr'}>
                      <button
                        onClick={(e) => { e.stopPropagation(); playAudio(optionText); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 flex-shrink-0"
                      >
                        <Volume2 className={`w-4 h-4 text-white/60 ${playingAudio === optionText ? 'animate-pulse' : ''}`} />
                      </button>
                      <div className={`flex-1 ${rtl ? 'text-right' : 'text-left'}`}>
                        <span className="text-white text-lg">{simplifiedText}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
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