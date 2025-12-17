import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, ChevronDown, ChevronUp, Sparkles, Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { toast } from "sonner";

export default function DailySongCard() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  
  const audioRef = useRef(null);
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
      
      // Step 1: Generate lyrics
      const lyricsResult = await base44.integrations.Core.InvokeLLM({
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

      // Step 2: Generate audio using TTS
      const audioText = lyricsResult.lyrics_he.replace(/\n/g, '. ');
      
      // Create audio using Web Speech API and convert to blob
      const audioBlob = await new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(audioText);
        utterance.lang = 'he-IL';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        
        // Record audio
        const mediaRecorder = new MediaRecorder(new MediaStream());
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/mpeg' }));
        
        utterance.onstart = () => mediaRecorder.start();
        utterance.onend = () => {
          setTimeout(() => mediaRecorder.stop(), 500);
        };
        utterance.onerror = reject;
        
        window.speechSynthesis.speak(utterance);
      });

      // Step 3: Upload audio to get public URL
      const audioFile = new File([audioBlob], `song-${today}.mp3`, { type: 'audio/mpeg' });
      const uploadResult = await base44.integrations.Core.UploadFile({ file: audioFile });
      
      // Step 4: Create song record with audio URL
      await createSongMutation.mutateAsync({
        date: today,
        vocab_words: lyricsResult.vocab_words,
        lyrics_he: lyricsResult.lyrics_he,
        lyrics_transliteration: lyricsResult.lyrics_transliteration,
        style: "warm acoustic pop",
        audio_url: uploadResult.file_url,
        audio_format: "mp3",
        duration_seconds: 30
      });
      
      toast.success("Song with audio ready! 🎵");
    } catch (e) {
      console.error("Song generation error:", e);
      toast.error("Failed to generate song - retrying...");
      
      // Fallback: Create song without audio for now
      try {
        const vocabList = wordsLearnedToday.map(w => `${w.word} (${w.translation})`).join(', ');
        const lyricsResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Create simple Hebrew song lyrics using: ${vocabList}`,
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
          vocab_words: lyricsResult.vocab_words,
          lyrics_he: lyricsResult.lyrics_he,
          lyrics_transliteration: lyricsResult.lyrics_transliteration,
          style: "warm acoustic pop",
          audio_url: null
        });
        
        toast.info("Lyrics ready - audio coming soon!");
      } catch (fallbackError) {
        toast.error("Failed to generate song");
      }
    }
    setGenerating(false);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setPlaying(false);
    const handleError = () => {
      setAudioError(true);
      setPlaying(false);
      toast.error("Audio unavailable—tap to retry");
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [todaySong]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setAudioError(false);
      audio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setAudioError(true);
        toast.error("Audio unavailable—tap to retry");
      });
    }
  };

  const skip = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'he-IL';
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
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
          {/* Audio Element - only if we have a valid audio URL */}
          {todaySong.audio_url && (
            <audio 
              ref={audioRef} 
              src={todaySong.audio_url}
              preload="metadata"
              crossOrigin="anonymous"
            />
          )}

          {/* Player Controls */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              {/* Play/Pause Button - LEFT */}
              {todaySong.audio_url ? (
                <button
                  onClick={togglePlay}
                  disabled={audioError}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    audioError 
                      ? "bg-red-500/50 cursor-not-allowed"
                      : playing 
                        ? "bg-pink-500 hover:bg-pink-600" 
                        : "bg-purple-500 hover:bg-purple-600"
                  }`}
                >
                  {playing ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </button>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                </div>
              )}

              {/* Skip Back */}
              <button
                onClick={() => skip(-10)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <SkipBack className="w-3 h-3 text-white" />
              </button>

              {/* Progress Bar */}
              <div className="flex-1">
                <div 
                  onClick={handleSeek}
                  className="h-2 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/40 text-[10px]">{formatTime(currentTime)}</span>
                  <span className="text-white/40 text-[10px]">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Skip Forward */}
              <button
                onClick={() => skip(10)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <SkipForward className="w-3 h-3 text-white" />
              </button>

              {/* Expand Button */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-white/60 hover:text-white"
              >
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2 px-2">
              <p className="text-white/60 text-xs flex-1">{todaySong.vocab_words.length} vocabulary words</p>
            </div>
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

                {/* Tap-to-Hear Vocab Words */}
                <div className="bg-white/5 rounded-xl p-3 mb-3">
                  <p className="text-white/60 text-xs mb-2">Tap to hear:</p>
                  <div className="flex flex-wrap gap-2">
                    {todaySong.vocab_words.map((word, idx) => (
                      <button
                        key={idx}
                        onClick={() => speakWord(word)}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all"
                      >
                        <Volume2 className="w-3 h-3 text-purple-300" />
                        <span className="text-white text-sm" dir="rtl">{word}</span>
                      </button>
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