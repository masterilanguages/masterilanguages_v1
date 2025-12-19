import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Music, Plus, Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";

export default function Songs() {
  const queryClient = useQueryClient();
  const [expandedSongId, setExpandedSongId] = useState(null);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const allSongs = await base44.entities.Song.list();
      return allSongs.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  });

  const { data: songProgress = [] } = useQuery({
    queryKey: ['songProgress'],
    queryFn: () => base44.entities.SongProgress.list(),
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const createSongProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.SongProgress.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songProgress'] }),
  });

  const updateSongProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SongProgress.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songProgress'] }),
  });

  const addWordToBackpack = async (word, songId, songTitle) => {
    const existingWord = wordRatings.find(w => w.word === word.hebrew);
    if (existingWord) {
      toast.info("Already in backpack!");
      return;
    }

    await createWordMutation.mutateAsync({
      word: word.hebrew,
      translation: word.english,
      phonetic: word.transliteration,
      category: `vocab for song ${songTitle}`,
      times_practiced: 1,
      mastered: false,
    });

    toast.success(`Added "${word.transliteration}" to backpack! 🎒`);

    // Update song progress
    const progress = songProgress.find(p => p.song_id === songId);
    const song = songs.find(s => s.id === songId);
    
    if (song) {
      const allWordsAdded = song.transcript.every(w => 
        wordRatings.find(wr => wr.word === w.hebrew) || w.hebrew === word.hebrew
      );

      if (progress) {
        const newWordsAdded = [...(progress.words_added || []), word.hebrew];
        await updateSongProgressMutation.mutateAsync({
          id: progress.id,
          data: { 
            words_added: newWordsAdded,
            completed: allWordsAdded
          }
        });
        if (allWordsAdded) {
          toast.success("🎉 Song completed! All words added!");
        }
      } else {
        await createSongProgressMutation.mutateAsync({
          song_id: songId,
          words_added: [word.hebrew],
          completed: allWordsAdded
        });
      }
    }
  };

  const getSongProgress = (songId) => {
    return songProgress.find(p => p.song_id === songId);
  };

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">🎵 Learn Hebrew Songs</h1>
            <p className="text-white/60">Watch, listen, and add vocab to your backpack</p>
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No songs yet! Come back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {songs.map((song) => {
              const isExpanded = expandedSongId === song.id;
              const progress = getSongProgress(song.id);
              const isCompleted = progress?.completed || false;
              const ytId = extractYouTubeId(song.youtube_url);

              return (
                <div
                  key={song.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedSongId(isExpanded ? null : song.id)}
                    className="flex gap-4 p-4 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Music className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <h3 className="text-white font-bold">{song.title}</h3>
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        Level {song.level} • {song.transcript?.length || 0} vocabulary words
                      </p>
                      {isCompleted && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 bg-slate-800/50 border-t border-white/20 space-y-4"
                    >
                      <div className="aspect-video bg-black rounded-xl overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={song.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
                        <p className="text-white/60 text-sm font-medium">📝 Song Vocabulary - Tap + to add to backpack</p>
                        {song.transcript?.map((line, idx) => {
                          const inBackpack = wordRatings.find(w => w.word === line.hebrew);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                inBackpack ? "bg-green-500/10 border border-green-500/30" : "bg-white/5 border border-white/10"
                              }`}
                            >
                              <div>
                                <span className="text-cyan-400 font-bold text-lg" dir="rtl">{line.hebrew}</span>
                                <p className="text-white/70 text-sm">{line.transliteration}</p>
                                <p className="text-white/50 text-xs">{line.english}</p>
                              </div>
                              <div>
                                {inBackpack ? (
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-white" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addWordToBackpack(line, song.id, song.title)}
                                    className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center transition-all"
                                  >
                                    <Plus className="w-5 h-5 text-amber-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}