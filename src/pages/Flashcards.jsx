import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Flashcards() {
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealState, setRevealState] = useState(0); // 0: image only, 1: +english, 2: +transliteration

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      if (coins.length === 0) {
        return await base44.entities.UserCoins.create({ coins: 100000000, unlocked_items: [] });
      }
      return coins[0];
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['words'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['words'] }),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const levelData = [
    { level: 0, label: "Level 0", subtitle: "New", color: "gray", gradient: "from-gray-500 to-slate-500" },
    { level: 1, label: "Level 1", subtitle: "Seen", color: "red", gradient: "from-red-500 to-pink-500" },
    { level: 2, label: "Level 2", subtitle: "Familiar", color: "orange", gradient: "from-orange-500 to-amber-500" },
    { level: 3, label: "Level 3", subtitle: "Practicing", color: "yellow", gradient: "from-yellow-500 to-lime-500" },
    { level: 4, label: "Level 4", subtitle: "Strong", color: "blue", gradient: "from-blue-500 to-cyan-500" },
    { level: 5, label: "Level 5", subtitle: "Mastered", color: "green", gradient: "from-green-500 to-emerald-500" },
  ];

  const getWordsForLevel = (level) => {
    return words.filter(w => (w.times_practiced || 0) === level);
  };

  const startSession = (level) => {
    const levelWords = getWordsForLevel(level);
    if (levelWords.length === 0) {
      toast.error("No words at this level yet!");
      return;
    }
    const shuffled = [...levelWords].sort(() => Math.random() - 0.5);
    setSessionWords(shuffled);
    setCurrentIndex(0);
    setRevealState(0);
    setSelectedLevel(level);
  };

  const handleCardTap = () => {
    if (revealState < 2) {
      setRevealState(revealState + 1);
    }
  };

  const handleRating = async (rating) => {
    const currentWord = sessionWords[currentIndex];
    
    await updateWordMutation.mutateAsync({
      id: currentWord.id,
      data: {
        times_practiced: rating,
        mastered: rating >= 5,
      },
    });

    // Award coins
    if (rating >= 3 && userCoins) {
      const coinsEarned = rating >= 5 ? 20 : 10;
      updateCoinsMutation.mutate({ coins: (userCoins.coins || 0) + coinsEarned });
      toast.success(`+${coinsEarned} coins!`, { icon: '🪙' });
    }

    // Move to next card
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealState(0);
    } else {
      toast.success("Session complete! 🎉");
      setSelectedLevel(null);
    }
  };

  const handleSkip = () => {
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealState(0);
    } else {
      setSelectedLevel(null);
    }
  };

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'he-IL';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const currentWord = sessionWords[currentIndex];

  // Filter screen
  if (selectedLevel === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Flashcards</h1>
              <p className="text-white/60">Pick a level to start learning</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {levelData.map(({ level, label, subtitle, gradient }) => {
              const count = getWordsForLevel(level).length;
              return (
                <motion.button
                  key={level}
                  whileHover={{ scale: count > 0 ? 1.05 : 1 }}
                  whileTap={{ scale: count > 0 ? 0.95 : 1 }}
                  onClick={() => count > 0 && startSession(level)}
                  className={`relative p-6 rounded-3xl border-2 transition-all ${
                    count > 0
                      ? 'border-white/20 bg-white/5 hover:border-cyan-400/50 cursor-pointer'
                      : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
                    <span className="text-3xl font-bold text-white">{level}</span>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-1">{label}</h3>
                  <p className="text-white/60 text-sm mb-2">{subtitle}</p>
                  <div className="bg-white/10 rounded-xl px-3 py-1 inline-block">
                    <span className="text-white font-medium">{count} words</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Flashcard session
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => setSelectedLevel(null)}
            variant="ghost"
            className="text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Exit
          </Button>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-white font-medium">
            {currentIndex + 1} / {sessionWords.length}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord?.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="mb-6"
          >
            {/* Card */}
            <div
              onClick={handleCardTap}
              className="bg-white/10 backdrop-blur-xl rounded-3xl border-2 border-white/20 p-8 cursor-pointer hover:border-cyan-400/50 transition-all min-h-[400px] flex flex-col items-center justify-center"
            >
              {/* Image */}
              {currentWord?.image_url && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-sm mb-6"
                >
                  <img
                    src={currentWord.image_url}
                    alt="Flashcard"
                    className="w-full h-64 object-contain rounded-2xl"
                  />
                </motion.div>
              )}

              {/* Tap indicator */}
              {revealState === 0 && (
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white/60 text-sm"
                >
                  Tap to reveal
                </motion.p>
              )}

              {/* English (reveal state 1+) */}
              {revealState >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4"
                >
                  <p className="text-white text-4xl font-bold mb-2">
                    {currentWord?.translation}
                  </p>
                </motion.div>
              )}

              {/* Transliteration (reveal state 2) */}
              {revealState >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="flex items-center gap-3 justify-center">
                    <p className="text-cyan-400 text-2xl font-medium">
                      {currentWord?.phonetic}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentWord);
                      }}
                      className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-all"
                    >
                      <Volume2 className="w-5 h-5 text-cyan-400" />
                    </button>
                  </div>
                  <p className="text-white/60 text-lg mt-2" dir="rtl">
                    {currentWord?.word}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Rating buttons (always visible) */}
            <div className="mt-6">
              <p className="text-white/60 text-center text-sm mb-3">
                How well do you know this word?
              </p>
              <div className="flex gap-2 justify-center mb-4">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <motion.button
                    key={rating}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRating(rating)}
                    className={`w-14 h-14 rounded-xl font-bold text-lg transition-all ${
                      rating === 0
                        ? "bg-gray-500/30 text-white/60 hover:bg-gray-500/50"
                        : rating === 5
                        ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg"
                        : rating >= 4
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                        : rating >= 3
                        ? "bg-gradient-to-br from-yellow-500 to-amber-500 text-white"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {rating}
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                >
                  Skip <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}