import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DailySongCard() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch today's song
  const { data: todaySong, isLoading } = useQuery({
    queryKey: ['dailySong', today],
    queryFn: async () => {
      const songs = await base44.entities.DailySong.filter({ date: today });
      return songs[0] || null;
    },
  });

  // Fetch words learned today
  const { data: wordsLearnedToday = [] } = useQuery({
    queryKey: ['wordsLearnedToday', today],
    queryFn: async () => {
      const allWords = await base44.entities.Word.list();
      // Get any words that have been practiced at least once
      const learnedWords = allWords.filter(w => w.times_practiced >= 1);
      return learnedWords.slice(0, 8); // Max 8 words for song
    },
  });

  const createSongMutation = useMutation({
    mutationFn: (songData) => base44.entities.DailySong.create(songData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailySong'] });
      toast.success("Your song is ready! 🎵");
    },
  });

  const generateSong = async () => {
    if (wordsLearnedToday.length === 0) {
      toast.error("Learn some words first!");
      return;
    }

    setGenerating(true);
    try {
      const vocabList = wordsLearnedToday.map(w => `${w.word} (${w.translation})`).join(', ');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Hebrew songwriting AI for a language learning app.

Create a simple, warm, 30-second Hebrew song using ONLY these vocabulary words the user learned today:
${vocabList}

Requirements:
- Use ALL provided vocab words naturally
- 4-6 short lines total
- Simple, repetitive structure (like a children's song)
- Modern Israeli Hebrew
- Warm, encouraging tone
- NO grammar explanations
- NO English words

Output valid JSON only:
{
  "lyrics_he": "Hebrew lyrics with line breaks",
  "lyrics_transliteration": "Transliterated lyrics (kh/tz/sh scheme)",
  "vocab_words": ["word1", "word2", ...]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            lyrics_he: { type: "string" },
            lyrics_transliteration: { type: "string" },
            vocab_words: { type: "array", items: { type: "string" } }
          }
        }
      });

      await createSongMutation.mutateAsync({
        date: today,
        vocab_words: result.vocab_words,
        lyrics_he: result.lyrics_he,
        lyrics_transliteration: result.lyrics_transliteration,
        style: "warm acoustic pop"
      });
    } catch (e) {
      toast.error("Failed to generate song");
    }
    setGenerating(false);
  };

  const playSong = () => {
    if (!todaySong) return;
    
    setPlaying(true);
    
    // Use browser TTS for now (can be replaced with music generation API)
    const lines = todaySong.lyrics_he.split('\n').filter(l => l.trim());
    let lineIndex = 0;
    
    const speakNextLine = () => {
      if (lineIndex >= lines.length) {
        setPlaying(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(lines[lineIndex]);
      utterance.lang = 'he-IL';
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.onend = () => {
        lineIndex++;
        setTimeout(speakNextLine, 500); // Pause between lines
      };
      window.speechSynthesis.speak(utterance);
    };
    
    speakNextLine();
  };

  const stopSong = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 hover:border-purple-400/50 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <h3 className="text-white font-bold text-lg">Your Song from Today</h3>
        </div>
        {wordsLearnedToday.length > 0 && (
          <span className="text-purple-400 text-xs">{wordsLearnedToday.length} words</span>
        )}
      </div>

      {!todaySong ? (
        <div className="text-center py-4">
          {wordsLearnedToday.length === 0 ? (
            <p className="text-white/60 text-sm mb-3">Learn some words today to unlock your personalized song!</p>
          ) : (
            <>
              <p className="text-white/80 text-sm mb-3">
                Generate a personalized Hebrew song with your {wordsLearnedToday.length} new words!
              </p>
              <Button
                onClick={generateSong}
                disabled={generating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate My Song</>
                )}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Play Button */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={playing ? stopSong : playSong}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                playing 
                  ? "bg-pink-500 hover:bg-pink-600" 
                  : "bg-purple-500 hover:bg-purple-600"
              }`}
            >
              {playing ? (
                <span className="text-white text-xl">⏸</span>
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-white font-medium">Today's Song</p>
              <p className="text-white/60 text-xs">{todaySong.vocab_words.length} vocabulary words</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-white/60 hover:text-white"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Expanded Lyrics */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-xs">Lyrics</p>
                  <button
                    onClick={() => setShowTranslit(!showTranslit)}
                    className={`text-xs px-2 py-1 rounded-full transition-all ${
                      showTranslit 
                        ? "bg-purple-500/30 text-purple-300" 
                        : "bg-white/10 text-white/50 hover:bg-white/20"
                    }`}
                  >
                    ABC
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-3">
                  <div className="space-y-2">
                    {todaySong.lyrics_he.split('\n').map((line, idx) => (
                      <div key={idx}>
                        <p className="text-white text-right" dir="rtl">
                          {line.split(' ').map((word, widx) => {
                            const isVocab = todaySong.vocab_words.some(v => 
                              word.replace(/[.,!?]/g, '').includes(v)
                            );
                            return (
                              <span
                                key={widx}
                                className={isVocab ? "text-purple-300 font-bold" : ""}
                              >
                                {word}{' '}
                              </span>
                            );
                          })}
                        </p>
                        {showTranslit && todaySong.lyrics_transliteration && (
                          <p className="text-white/40 text-xs mt-1">
                            {todaySong.lyrics_transliteration.split('\n')[idx]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={generateSong}
                  disabled={generating}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                  size="sm"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Regenerate Song
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}