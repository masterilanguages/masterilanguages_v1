import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Step6Song({ story, onComplete }) {
  const queryClient = useQueryClient();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const audioRef = useRef(null);

  const { data: song, isLoading } = useQuery({
    queryKey: ['storySong', story.story_id],
    queryFn: async () => {
      const songs = await base44.entities.StorySong.filter({ story_id: story.story_id });
      return songs[0] || null;
    },
  });

  const createSongMutation = useMutation({
    mutationFn: (data) => base44.entities.StorySong.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storySong'] });
    },
  });

  const generateSong = async () => {
    setGenerating(true);
    try {
      const vocabList = story.story_vocab_core.map(v => v.word_he).join(', ');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a simple 30-second Hebrew song about the story "${story.title}" using these words: ${vocabList}

Requirements:
- 4-6 short lines
- Simple, warm melody
- Use story vocabulary
- Encouraging tone

Return JSON:
{
  "lyrics_he": "Hebrew lyrics with line breaks",
  "lyrics_transliteration": "Transliterated lyrics"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            lyrics_he: { type: "string" },
            lyrics_transliteration: { type: "string" }
          }
        }
      });

      await createSongMutation.mutateAsync({
        story_id: story.story_id,
        lyrics_he: result.lyrics_he,
        lyrics_transliteration: result.lyrics_transliteration,
        audio_url: null,
        duration_seconds: 30
      });

      toast.success("Song ready! 🎵");
    } catch (e) {
      toast.error("Failed to generate song");
    }
    setGenerating(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const speakLyrics = () => {
    if (!song) return;
    const utterance = new SpeechSynthesisUtterance(song.lyrics_he);
    utterance.lang = 'he-IL';
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl mb-2">Step 6: Your Reward Song</h2>
        <p className="text-white/60 text-sm">A special song about your story!</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : !song ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-white/80 mb-6">Generate your personalized story song!</p>
          <Button
            onClick={generateSong}
            disabled={generating}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Song</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {song.audio_url && (
            <audio ref={audioRef} src={song.audio_url} onEnded={() => setPlaying(false)} />
          )}

          <div className="flex items-center gap-4 justify-center">
            {song.audio_url ? (
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center"
              >
                {playing ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                )}
              </button>
            ) : (
              <button
                onClick={speakLyrics}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center"
              >
                <Volume2 className="w-8 h-8 text-white" />
              </button>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className="text-cyan-400 hover:text-cyan-300 text-sm underline"
            >
              {showLyrics ? "Hide" : "Show"} Lyrics
            </button>
          </div>

          {showLyrics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-white/5 rounded-xl p-4"
            >
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowTranslit(!showTranslit)}
                  className={`text-xs px-3 py-1 rounded-full ${
                    showTranslit ? "bg-purple-500/30 text-purple-300" : "bg-white/10 text-white/50"
                  }`}
                >
                  ABC
                </button>
              </div>
              <div className="space-y-2">
                {song.lyrics_he.split('\n').map((line, idx) => (
                  <div key={idx}>
                    <p className="text-white text-right" dir="rtl">{line}</p>
                    {showTranslit && song.lyrics_transliteration && (
                      <p className="text-white/40 text-xs mt-1">
                        {song.lyrics_transliteration.split('\n')[idx]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <Button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
          >
            Complete Story! 🎉
          </Button>
        </div>
      )}
    </div>
  );
}