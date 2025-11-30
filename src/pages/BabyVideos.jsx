import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Coins, Check, Backpack, X, Volume2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import ClickableWord from "../components/learning/ClickableWord";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Level 1 videos - kids cartoons and songs
const level1Videos = [
  { 
    id: 1, 
    title: "Hebrew Alphabet Song", 
    thumbnail: "https://img.youtube.com/vi/UiCzoTs1AdE/maxresdefault.jpg",
    youtubeId: "UiCzoTs1AdE",
    duration: "3:45", 
    coins: 25,
    transcript: [
      { hebrew: "אלף", transliteration: "Alef", meaning: "First letter", time: "0:10" },
      { hebrew: "בית", transliteration: "Bet", meaning: "Second letter", time: "0:15" },
      { hebrew: "גימל", transliteration: "Gimel", meaning: "Third letter", time: "0:20" },
      { hebrew: "דלת", transliteration: "Dalet", meaning: "Fourth letter", time: "0:25" },
    ]
  },
  { 
    id: 2, 
    title: "Colors in Hebrew for Kids", 
    thumbnail: "https://img.youtube.com/vi/yBVWfDoJhXo/maxresdefault.jpg",
    youtubeId: "yBVWfDoJhXo",
    duration: "4:20", 
    coins: 30,
    transcript: [
      { hebrew: "אדום", transliteration: "Adom", meaning: "Red", time: "0:30" },
      { hebrew: "כחול", transliteration: "Kachol", meaning: "Blue", time: "0:45" },
      { hebrew: "ירוק", transliteration: "Yarok", meaning: "Green", time: "1:00" },
      { hebrew: "צהוב", transliteration: "Tzahov", meaning: "Yellow", time: "1:15" },
    ]
  },
  { 
    id: 3, 
    title: "Hebrew Numbers 1-10", 
    thumbnail: "https://img.youtube.com/vi/DlF2bVpPO3o/maxresdefault.jpg",
    youtubeId: "DlF2bVpPO3o",
    duration: "5:10", 
    coins: 35,
    transcript: [
      { hebrew: "אחת", transliteration: "Achat", meaning: "One", time: "0:20" },
      { hebrew: "שתיים", transliteration: "Shtayim", meaning: "Two", time: "0:35" },
      { hebrew: "שלוש", transliteration: "Shalosh", meaning: "Three", time: "0:50" },
      { hebrew: "ארבע", transliteration: "Arba", meaning: "Four", time: "1:05" },
    ]
  },
  { 
    id: 4, 
    title: "Animals in Hebrew", 
    thumbnail: "https://img.youtube.com/vi/dAv22Y9t_CU/maxresdefault.jpg",
    youtubeId: "dAv22Y9t_CU",
    duration: "6:30", 
    coins: 40,
    transcript: [
      { hebrew: "כלב", transliteration: "Kelev", meaning: "Dog", time: "0:15" },
      { hebrew: "חתול", transliteration: "Chatul", meaning: "Cat", time: "0:30" },
      { hebrew: "ציפור", transliteration: "Tzipor", meaning: "Bird", time: "0:45" },
      { hebrew: "דג", transliteration: "Dag", meaning: "Fish", time: "1:00" },
    ]
  },
];

export default function BabyVideos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [backpackOpen, setBackpackOpen] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
  });

  const { data: backpackWords = [] } = useQuery({
    queryKey: ['backpackWords'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const addToBackpackMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create({
      word: word.hebrew,
      translation: word.meaning,
      phonetic: word.transliteration,
      category: "wordbank",
      difficulty: "beginner",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backpackWords'] });
      toast.success("Added to My Backpack! 🎒");
    },
  });

  const watchVideo = (video) => {
    setSelectedVideo(video);
  };

  const finishVideo = () => {
    if (selectedVideo) {
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + selectedVideo.coins });
      toast.success(`+${selectedVideo.coins} coins earned! 🪙`);
    }
    setSelectedVideo(null);
  };

  const isInBackpack = (hebrew) => {
    return backpackWords.some(w => w.word === hebrew);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">📺 TV Time!</h1>
              <p className="text-white/60">Watch videos & learn Hebrew words</p>
            </div>
          </div>
          <Button
            onClick={() => setBackpackOpen(true)}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/50"
          >
            <Backpack className="w-5 h-5 mr-2" />
            My Backpack ({backpackWords.length})
          </Button>
        </div>

        {/* Video Player */}
        {selectedVideo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
          >
            {/* Video embed */}
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Transcript with clickable words */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">📝 Words in this video</h3>
                <p className="text-white/60 text-sm">Click any word to learn more & add to backpack</p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {selectedVideo.transcript.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-xs">{item.time}</span>
                      <div>
                        <ClickableWord
                          word={item.hebrew}
                          transliteration={item.transliteration}
                          translation={item.meaning}
                          variant="hebrew"
                          className="text-xl text-cyan-400 font-bold"
                        />
                        <p className="text-white/60 text-sm">{item.transliteration}</p>
                      </div>
                    </div>
                    {isInBackpack(item.hebrew) ? (
                      <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToBackpackMutation.mutate(item)}
                        className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      >
                        <Backpack className="w-4 h-4 mr-1" /> Add
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={finishVideo}
                className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-6 text-lg"
              >
                Done Watching (+{selectedVideo.coins} coins) ✓
              </Button>
            </div>
          </motion.div>
        ) : (
          /* Video Grid */
          <div className="grid sm:grid-cols-2 gap-4">
            {level1Videos.map((video) => (
              <motion.div
                key={video.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => watchVideo(video)}
                className="relative bg-white/5 backdrop-blur-xl rounded-2xl border-2 border-white/10 overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="aspect-video bg-black relative">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/480x360/1e1b4b/ffffff?text=${encodeURIComponent(video.title)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-bold text-lg">{video.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60 text-sm">{video.duration}</span>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">+{video.coins}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Backpack Dialog */}
      <Dialog open={backpackOpen} onOpenChange={setBackpackOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Backpack className="w-6 h-6 text-amber-400" />
              My Backpack
            </DialogTitle>
          </DialogHeader>
          
          {backpackWords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">Your backpack is empty!</p>
              <p className="text-white/40 text-sm mt-2">Add words from videos to save them here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {backpackWords.map((word) => (
                <div
                  key={word.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-cyan-400 font-bold" dir="rtl">{word.word}</p>
                    <p className="text-white/60 text-sm">{word.phonetic} - {word.translation}</p>
                  </div>
                  <ClickableWord
                    word={word.word}
                    transliteration={word.phonetic}
                    translation={word.translation}
                    variant="hebrew"
                    className="text-cyan-400 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}