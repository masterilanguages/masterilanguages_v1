import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Coins, Check, Backpack, Volume2, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import ClickableWord from "../components/learning/ClickableWord";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Videos with transcripts
const level1Videos = [
  { 
    id: 1, 
    title: "Colors in Hebrew - לִמּוּד צְבָעִים", 
    thumbnail: "https://img.youtube.com/vi/yBVWfDoJhXo/maxresdefault.jpg",
    youtubeId: "yBVWfDoJhXo",
    duration: "4:20", 
    coins: 50,
    category: "Colors",
    transcript: [
      { hebrew: "אָדוֹם", transliteration: "Adom", meaning: "Red", time: "0:15" },
      { hebrew: "כָּתוֹם", transliteration: "Katom", meaning: "Orange", time: "0:25" },
      { hebrew: "צָהוֹב", transliteration: "Tzahov", meaning: "Yellow", time: "0:35" },
      { hebrew: "יָרוֹק", transliteration: "Yarok", meaning: "Green", time: "0:45" },
      { hebrew: "כָּחוֹל", transliteration: "Kachol", meaning: "Blue", time: "0:55" },
      { hebrew: "סָגוֹל", transliteration: "Sagol", meaning: "Purple", time: "1:05" },
      { hebrew: "וָרוֹד", transliteration: "Varod", meaning: "Pink", time: "1:15" },
      { hebrew: "חוּם", transliteration: "Chum", meaning: "Brown", time: "1:25" },
      { hebrew: "שָׁחוֹר", transliteration: "Shachor", meaning: "Black", time: "1:35" },
      { hebrew: "לָבָן", transliteration: "Lavan", meaning: "White", time: "1:45" },
      { hebrew: "אָפוֹר", transliteration: "Afor", meaning: "Gray", time: "1:55" },
      { hebrew: "זָהָב", transliteration: "Zahav", meaning: "Gold", time: "2:05" },
    ]
  },
  { 
    id: 2, 
    title: "Hebrew Alphabet Song - אלף בית", 
    thumbnail: "https://img.youtube.com/vi/UiCzoTs1AdE/maxresdefault.jpg",
    youtubeId: "UiCzoTs1AdE",
    duration: "3:45", 
    coins: 40,
    category: "Alphabet",
    transcript: [
      { hebrew: "אָלֶף", transliteration: "Alef", meaning: "First letter", time: "0:10" },
      { hebrew: "בֵּית", transliteration: "Bet", meaning: "Second letter", time: "0:15" },
      { hebrew: "גִּימֶל", transliteration: "Gimel", meaning: "Third letter", time: "0:20" },
      { hebrew: "דָּלֶת", transliteration: "Dalet", meaning: "Fourth letter", time: "0:25" },
      { hebrew: "הֵא", transliteration: "Hey", meaning: "Fifth letter", time: "0:30" },
      { hebrew: "וָו", transliteration: "Vav", meaning: "Sixth letter", time: "0:35" },
    ]
  },
  { 
    id: 3, 
    title: "Numbers 1-10 - מספרים", 
    thumbnail: "https://img.youtube.com/vi/DlF2bVpPO3o/maxresdefault.jpg",
    youtubeId: "DlF2bVpPO3o",
    duration: "5:10", 
    coins: 45,
    category: "Numbers",
    transcript: [
      { hebrew: "אַחַת", transliteration: "Achat", meaning: "One", time: "0:20" },
      { hebrew: "שְׁתַּיִם", transliteration: "Shtayim", meaning: "Two", time: "0:35" },
      { hebrew: "שָׁלוֹשׁ", transliteration: "Shalosh", meaning: "Three", time: "0:50" },
      { hebrew: "אַרְבַּע", transliteration: "Arba", meaning: "Four", time: "1:05" },
      { hebrew: "חָמֵשׁ", transliteration: "Chamesh", meaning: "Five", time: "1:20" },
      { hebrew: "שֵׁשׁ", transliteration: "Shesh", meaning: "Six", time: "1:35" },
      { hebrew: "שֶׁבַע", transliteration: "Sheva", meaning: "Seven", time: "1:50" },
      { hebrew: "שְׁמוֹנֶה", transliteration: "Shmoneh", meaning: "Eight", time: "2:05" },
      { hebrew: "תֵּשַׁע", transliteration: "Tesha", meaning: "Nine", time: "2:20" },
      { hebrew: "עֶשֶׂר", transliteration: "Eser", meaning: "Ten", time: "2:35" },
    ]
  },
  { 
    id: 4, 
    title: "Learn Hebrew Every Day - הַרְגָלִים", 
    thumbnail: "https://img.youtube.com/vi/n8XvkVp6CfQ/maxresdefault.jpg",
    youtubeId: "n8XvkVp6CfQ",
    duration: "13:07", 
    coins: 75,
    category: "Daily Habits",
    transcript: [
      { hebrew: "הֶרְגֵּל", transliteration: "Hergel", meaning: "Habit", time: "0:30" },
      { hebrew: "לִלְמוֹד", transliteration: "Lilmod", meaning: "To learn", time: "1:00" },
      { hebrew: "כָּל יוֹם", transliteration: "Kol yom", meaning: "Every day", time: "1:30" },
      { hebrew: "עָסוּק", transliteration: "Asuk", meaning: "Busy", time: "2:00" },
      { hebrew: "זְמַן", transliteration: "Zman", meaning: "Time", time: "2:30" },
      { hebrew: "דַּקָּה", transliteration: "Daka", meaning: "Minute", time: "3:00" },
      { hebrew: "קָשֶׁה", transliteration: "Kashe", meaning: "Hard/Difficult", time: "3:30" },
      { hebrew: "קַל", transliteration: "Kal", meaning: "Easy", time: "4:00" },
      { hebrew: "לְהִתְחִיל", transliteration: "Lehatchil", meaning: "To start", time: "4:30" },
      { hebrew: "לְהַמְשִׁיךְ", transliteration: "Lehamshich", meaning: "To continue", time: "5:00" },
      { hebrew: "לֹא לְוַתֵּר", transliteration: "Lo levater", meaning: "Don't give up", time: "5:30" },
      { hebrew: "הַצְלָחָה", transliteration: "Hatzlacha", meaning: "Success", time: "6:00" },
      { hebrew: "לְתַרְגֵּל", transliteration: "Letargel", meaning: "To practice", time: "6:30" },
      { hebrew: "עִבְרִית", transliteration: "Ivrit", meaning: "Hebrew", time: "7:00" },
      { hebrew: "לְדַבֵּר", transliteration: "Ledaber", meaning: "To speak", time: "7:30" },
      { hebrew: "לִקְרוֹא", transliteration: "Likro", meaning: "To read", time: "8:00" },
      { hebrew: "לִכְתּוֹב", transliteration: "Lichtov", meaning: "To write", time: "8:30" },
      { hebrew: "לִשְׁמוֹעַ", transliteration: "Lishmoa", meaning: "To listen", time: "9:00" },
      { hebrew: "סְרָטוֹן", transliteration: "Sirton", meaning: "Video", time: "9:30" },
      { hebrew: "טִיפִּים", transliteration: "Tipim", meaning: "Tips", time: "10:00" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'הֶרְגֵּל' (Hergel) mean?",
        options: ["Time", "Habit", "Day", "Easy"],
        correct: 1
      },
      {
        type: "multiple_choice",
        question: "How do you say 'every day' in Hebrew?",
        options: ["Kol yom", "Zman", "Daka", "Kashe"],
        correct: 0
      },
      {
        type: "fill_blank",
        question: "Complete: '___ levater' means 'Don't give up'",
        answer: "Lo",
        hebrew: "לֹא לְוַתֵּר"
      },
      {
        type: "multiple_choice",
        question: "What is the opposite of 'קָשֶׁה' (Kashe - Hard)?",
        options: ["Asuk", "Kal", "Zman", "Hergel"],
        correct: 1
      },
      {
        type: "translate",
        question: "Translate to English: לִלְמוֹד עִבְרִית כָּל יוֹם",
        answer: "To learn Hebrew every day"
      }
    ]
  },
];

export default function BabyVideos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [showFluent, setShowFluent] = useState(false);

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

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const getWordRating = (hebrew) => {
    const found = wordRatings.find(w => w.word === hebrew);
    return found?.times_practiced || 0;
  };

  const handleRate = async (word, rating) => {
    const existingWord = wordRatings.find(w => w.word === word.hebrew);
    
    if (existingWord) {
      await updateWordMutation.mutateAsync({
        id: existingWord.id,
        data: { 
          times_practiced: rating,
          mastered: rating >= 5,
        }
      });
    } else {
      await createWordMutation.mutateAsync({
        word: word.hebrew,
        translation: word.meaning,
        phonetic: word.transliteration,
        category: "wordbank",
        times_practiced: rating,
        mastered: rating >= 5,
      });
    }

    if (rating >= 5) {
      toast.success("Added to Fluent! ⭐");
    }
  };

  const finishVideo = () => {
    if (selectedVideo) {
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + selectedVideo.coins });
      toast.success(`+${selectedVideo.coins} coins earned! 🪙`);
    }
    setSelectedVideo(null);
  };

  const fluentWords = wordRatings.filter(w => w.times_practiced >= 5);
  const learningWords = wordRatings.filter(w => w.times_practiced > 0 && w.times_practiced < 5);

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
              <h1 className="text-3xl font-bold text-white">📺 Hebrew TV</h1>
              <p className="text-white/60">Watch videos & rate words you learn</p>
            </div>
          </div>
          <Button
            onClick={() => setBackpackOpen(true)}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/50"
          >
            <Backpack className="w-5 h-5 mr-2" />
            Backpack ({fluentWords.length} ⭐)
          </Button>
        </div>

        {/* Video Player */}
        {selectedVideo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
          >
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

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">📝 Rate the words you know</h3>
                <p className="text-white/60 text-sm">5 = Fluent ⭐</p>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedVideo.transcript.map((item, idx) => {
                  const currentRating = getWordRating(item.hebrew);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`border rounded-xl p-4 flex items-center justify-between ${
                        currentRating >= 5 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-white/40 text-xs w-12">{item.time}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <ClickableWord
                              word={item.hebrew}
                              transliteration={item.transliteration}
                              translation={item.meaning}
                              variant="hebrew"
                              className="text-2xl text-cyan-400 font-bold"
                            />
                            {currentRating >= 5 && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                          </div>
                          <p className="text-white/60 text-sm">{item.transliteration} = {item.meaning}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            onClick={() => handleRate(item, num)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all hover:scale-110 ${
                              currentRating >= num 
                                ? num === 5 
                                  ? "bg-green-500 text-white" 
                                  : "bg-cyan-500 text-white"
                                : "bg-white/10 text-white/50 hover:bg-white/20"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
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
          <div className="grid sm:grid-cols-2 gap-4">
            {level1Videos.map((video) => (
              <motion.div
                key={video.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedVideo(video)}
                className="relative bg-white/5 backdrop-blur-xl rounded-2xl border-2 border-white/10 overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="absolute top-3 left-3 bg-purple-500/80 px-2 py-1 rounded-full text-xs text-white font-medium">
                  {video.category}
                </div>
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
                  <h3 className="text-white font-bold">{video.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60 text-sm">{video.transcript.length} words</span>
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
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Backpack className="w-6 h-6 text-amber-400" />
              My Backpack
            </DialogTitle>
          </DialogHeader>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowFluent(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                showFluent ? "bg-green-500/20 text-green-400 border border-green-500/50" : "bg-white/5 text-white/60"
              }`}
            >
              ⭐ Fluent ({fluentWords.length})
            </button>
            <button
              onClick={() => setShowFluent(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                !showFluent ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : "bg-white/5 text-white/60"
              }`}
            >
              📚 Learning ({learningWords.length})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {(showFluent ? fluentWords : learningWords).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60">
                  {showFluent ? "No fluent words yet!" : "No words in progress!"}
                </p>
                <p className="text-white/40 text-sm mt-2">
                  {showFluent ? "Rate words 5/5 to add them here." : "Start rating words to track progress."}
                </p>
              </div>
            ) : (
              (showFluent ? fluentWords : learningWords).map((word) => (
                <div
                  key={word.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-lg" dir="rtl">{word.word}</span>
                      {word.times_practiced >= 5 && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-white/60 text-sm">{word.phonetic} - {word.translation}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(num => (
                      <div
                        key={num}
                        className={`w-4 h-4 rounded-full ${
                          word.times_practiced >= num ? "bg-cyan-500" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}