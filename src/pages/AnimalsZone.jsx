import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

const animals = [
  { 
    hebrew: "כֶּלֶב", 
    transliteration: "Kelev", 
    meaning: "Dog",
    emoji: "🐕",
    sound: "woof woof!",
    color: "from-amber-500 to-orange-500"
  },
  { 
    hebrew: "חָתוּל", 
    transliteration: "Chatul", 
    meaning: "Cat",
    emoji: "🐈",
    sound: "meow!",
    color: "from-purple-500 to-pink-500"
  },
  { 
    hebrew: "צִפּוֹר", 
    transliteration: "Tzipor", 
    meaning: "Bird",
    emoji: "🐦",
    sound: "tweet tweet!",
    color: "from-blue-500 to-cyan-500"
  },
];

export default function AnimalsZone() {
  const queryClient = useQueryClient();
  const [currentAnimal, setCurrentAnimal] = useState(null);
  const [petCount, setPetCount] = useState(0);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [hearts, setHearts] = useState([]);

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

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  useEffect(() => {
    if (!currentAnimal) {
      playRandomAnimal();
    }
  }, []);

  const playRandomAnimal = () => {
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    setCurrentAnimal(randomAnimal);
    setPetCount(0);
    
    setTimeout(() => {
      speakHebrew(randomAnimal.transliteration);
    }, 500);
  };

  const speakHebrew = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const handleAnimalSelect = (animal) => {
    if (animal.hebrew === currentAnimal.hebrew) {
      toast.success("Nice! 🎉");
      speakHebrew(animal.transliteration);
    } else {
      toast(`Almost! That's a ${animal.meaning}`, { icon: "😊" });
      speakHebrew(animal.transliteration);
    }
  };

  const handlePetAnimal = () => {
    const newPetCount = petCount + 1;
    setPetCount(newPetCount);
    
    const heart = {
      id: Date.now(),
      x: Math.random() * 100,
      y: Math.random() * 50 + 25
    };
    setHearts(prev => [...prev, heart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== heart.id));
    }, 1000);

    if (newPetCount === 3) {
      const coins = 10;
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + coins });
      updateProfileMutation.mutate({ xp: (userProfile?.xp || 0) + 5 });
      
      createWordMutation.mutate({
        word: currentAnimal.hebrew,
        translation: currentAnimal.meaning,
        phonetic: currentAnimal.transliteration,
        category: "wordbank",
        times_practiced: 1,
        mastered: false,
      });

      toast.success(`Great job! +${coins} coins! 🎉`);
      
      setTimeout(() => {
        playRandomAnimal();
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">🐾 Animal Friends</h1>
          <button
            onClick={() => setShowTransliteration(!showTransliteration)}
            className="text-white/60 hover:text-white text-sm"
          >
            {showTransliteration ? "Hide" : "Show"} Help
          </button>
        </div>

        {currentAnimal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl mb-4 cursor-pointer"
                onClick={handlePetAnimal}
              >
                {currentAnimal.emoji}
              </motion.div>

              <AnimatePresence>
                {hearts.map(heart => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, x: `${heart.x}%` }}
                    animate={{ opacity: 0, y: -100 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute text-3xl pointer-events-none"
                    style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
                  >
                    ❤️
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  onClick={() => speakHebrew(currentAnimal.transliteration)}
                  className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center"
                >
                  <Volume2 className="w-6 h-6 text-cyan-400" />
                </button>
                <h2 className="text-5xl font-bold text-white" dir="rtl">{currentAnimal.hebrew}</h2>
              </div>

              {showTransliteration && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl text-white/70 mb-2"
                >
                  {currentAnimal.transliteration}
                </motion.p>
              )}

              <p className="text-white/50 text-sm mb-4">{currentAnimal.sound}</p>

              <div className="flex gap-2 justify-center mb-4">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-6 h-6 ${
                      i < petCount ? "text-pink-500 fill-pink-500" : "text-white/20"
                    }`}
                  />
                ))}
              </div>

              <p className="text-white/60 text-sm">
                {petCount === 0 ? "Tap the animal to pet it! 🐾" : 
                 petCount === 1 ? "Nice! Pet 2 more times!" :
                 petCount === 2 ? "One more time!" : "Amazing! 🎉"}
              </p>
            </div>
          </motion.div>
        )}

        <div>
          <p className="text-white/80 text-center mb-4">Which animal do you hear?</p>
          <div className="grid grid-cols-3 gap-4">
            {animals.map((animal, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnimalSelect(animal)}
                className={`bg-gradient-to-br ${animal.color} rounded-2xl p-6 text-center border-2 border-white/20 hover:border-white/50 transition-all`}
              >
                <div className="text-6xl mb-2">{animal.emoji}</div>
                {showTransliteration && (
                  <p className="text-white font-medium text-sm">{animal.transliteration}</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={playRandomAnimal}
          className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl py-4 text-white font-medium"
        >
          🔄 Next Animal
        </motion.button>
      </div>
    </div>
  );
}