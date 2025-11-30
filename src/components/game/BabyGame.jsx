import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Cookie, Moon, Bath, Gamepad2, Heart, Tv, Volume2, Sparkles, Check, X, Backpack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ClickableWord from "../learning/ClickableWord";

const needs = [
  { 
    id: "water", 
    icon: Droplets, 
    color: "from-blue-400 to-cyan-400",
    hebrew: "מים",
    transliteration: "Mayim",
    meaning: "Water",
    items: [
      { id: "water", emoji: "💧", label: "Water", correct: true },
      { id: "milk", emoji: "🥛", label: "Milk", correct: false },
      { id: "juice", emoji: "🧃", label: "Juice", correct: false },
      { id: "soda", emoji: "🥤", label: "Soda", correct: false },
    ]
  },
  { 
    id: "food", 
    icon: Cookie, 
    color: "from-amber-400 to-orange-400",
    hebrew: "אוכל",
    transliteration: "Ochel",
    meaning: "Food",
    items: [
      { id: "food", emoji: "🍽️", label: "Food", correct: true },
      { id: "toy", emoji: "🧸", label: "Toy", correct: false },
      { id: "book", emoji: "📚", label: "Book", correct: false },
      { id: "ball", emoji: "⚽", label: "Ball", correct: false },
    ]
  },
  { 
    id: "sleep", 
    icon: Moon, 
    color: "from-indigo-400 to-purple-400",
    hebrew: "לישון",
    transliteration: "Lishon",
    meaning: "Sleep",
    items: [
      { id: "bed", emoji: "🛏️", label: "Bed", correct: true },
      { id: "chair", emoji: "🪑", label: "Chair", correct: false },
      { id: "table", emoji: "🪑", label: "Table", correct: false },
      { id: "sofa", emoji: "🛋️", label: "Sofa", correct: false },
    ]
  },
  { 
    id: "bathroom", 
    icon: Bath, 
    color: "from-teal-400 to-emerald-400",
    hebrew: "שירותים",
    transliteration: "Sherutim",
    meaning: "Bathroom",
    items: [
      { id: "toilet", emoji: "🚽", label: "Toilet", correct: true },
      { id: "shower", emoji: "🚿", label: "Shower", correct: false },
      { id: "sink", emoji: "🚰", label: "Sink", correct: false },
      { id: "bath", emoji: "🛁", label: "Bathtub", correct: false },
    ]
  },
  { 
    id: "pipi", 
    icon: Droplets, 
    color: "from-yellow-400 to-amber-400",
    hebrew: "פיפי",
    transliteration: "Pipi",
    meaning: "Pee pee",
    items: [
      { id: "toilet", emoji: "🚽", label: "Toilet", correct: true },
      { id: "bed", emoji: "🛏️", label: "Bed", correct: false },
      { id: "kitchen", emoji: "🍳", label: "Kitchen", correct: false },
      { id: "garden", emoji: "🌳", label: "Garden", correct: false },
    ]
  },
  { 
    id: "poop", 
    icon: Bath, 
    color: "from-amber-600 to-yellow-600",
    hebrew: "קקי",
    transliteration: "Kaki",
    meaning: "Poop",
    items: [
      { id: "toilet", emoji: "🚽", label: "Toilet", correct: true },
      { id: "diaper", emoji: "🧷", label: "Diaper", correct: false },
      { id: "outside", emoji: "🌲", label: "Outside", correct: false },
      { id: "floor", emoji: "🟫", label: "Floor", correct: false },
    ]
  },
  { 
    id: "play", 
    icon: Gamepad2, 
    color: "from-pink-400 to-rose-400",
    hebrew: "לשחק",
    transliteration: "Lesachek",
    meaning: "Play",
    items: [
      { id: "toy", emoji: "🧸", label: "Toy", correct: true },
      { id: "food", emoji: "🍽️", label: "Food", correct: false },
      { id: "blanket", emoji: "🛏️", label: "Blanket", correct: false },
      { id: "book", emoji: "📖", label: "Book", correct: false },
    ]
  },
  { 
    id: "hug", 
    icon: Heart, 
    color: "from-red-400 to-pink-400",
    hebrew: "חיבוק",
    transliteration: "Chibuk",
    meaning: "Hug",
    items: [
      { id: "hug", emoji: "🤗", label: "Hug", correct: true },
      { id: "wave", emoji: "👋", label: "Wave", correct: false },
      { id: "clap", emoji: "👏", label: "Clap", correct: false },
      { id: "point", emoji: "👆", label: "Point", correct: false },
    ]
  },
];

export default function BabyGame({ avatarName, onCorrect, correctCount = 0, onWatchTV }) {
  const [currentNeed, setCurrentNeed] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [isAsking, setIsAsking] = useState(false);

  // Pick a random need when component mounts or after correct answer
  useEffect(() => {
    if (!currentNeed && !feedback) {
      pickRandomNeed();
    }
  }, [currentNeed, feedback]);

  const pickRandomNeed = () => {
    const randomNeed = needs[Math.floor(Math.random() * needs.length)];
    // Shuffle items
    const shuffledItems = [...randomNeed.items].sort(() => Math.random() - 0.5);
    setCurrentNeed({ ...randomNeed, items: shuffledItems });
    setShowTranslation(false);
    setSelectedItem(null);
    setFeedback(null);
    setIsAsking(true);
  };

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    speechSynthesis.speak(utterance);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (item.correct) {
      setFeedback('correct');
      playAudio("יופי!");
      setTimeout(() => {
        onCorrect(currentNeed);
        setCurrentNeed(null);
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        setSelectedItem(null);
      }, 1000);
    }
  };

  const canWatchTV = correctCount >= 10;

  if (!currentNeed) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto"
        />
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
      {/* Progress & TV Reward */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500/20 px-3 py-1 rounded-full">
            <span className="text-cyan-400 font-bold">{correctCount}/10</span>
          </div>
          <span className="text-white/60 text-sm">correct to unlock TV</span>
        </div>
        {canWatchTV && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            onClick={onWatchTV}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-xl text-white font-bold"
          >
            <Tv className="w-5 h-5" />
            Watch TV! 📺
          </motion.button>
        )}
      </div>

      {/* Baby Request */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block"
        >
          <div className="bg-white/10 rounded-2xl px-6 py-4 mb-4 relative">
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/10 rotate-45" />
            
            <p className="text-white/60 text-sm mb-2">👶 {avatarName} says:</p>
            
            {/* Hebrew word - clickable for translation */}
            <div className="flex items-center justify-center gap-3">
              <motion.p 
                className="text-4xl font-bold cursor-pointer"
                dir="rtl"
                onClick={() => setShowTranslation(!showTranslation)}
                whileHover={{ scale: 1.05 }}
              >
                <ClickableWord
                  word={currentNeed.hebrew}
                  transliteration={currentNeed.transliteration}
                  translation={currentNeed.meaning}
                  variant="hebrew"
                  className="text-cyan-400"
                />
              </motion.p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playAudio(currentNeed.hebrew)}
                className="text-cyan-400"
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Transliteration always shown */}
            <p className="text-white/80 text-lg mt-1">{currentNeed.transliteration}</p>

            {/* Translation only shown on click */}
            <AnimatePresence>
              {showTranslation && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-green-400 text-sm mt-2"
                >
                  = {currentNeed.meaning}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="text-white/40 text-xs mt-2">
              (tap the word to see translation)
            </p>
          </div>
        </motion.div>
      </div>

      {/* Item Selection */}
      <div className="grid grid-cols-2 gap-3">
        {currentNeed.items.map((item, idx) => (
          <motion.button
            key={item.id + idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleItemClick(item)}
            disabled={feedback === 'correct'}
            className={`relative bg-white/10 border-2 rounded-2xl p-4 text-center transition-all ${
              selectedItem?.id === item.id && feedback === 'correct'
                ? 'border-green-500 bg-green-500/20'
                : selectedItem?.id === item.id && feedback === 'wrong'
                ? 'border-red-500 bg-red-500/20 animate-shake'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <span className="text-4xl">{item.emoji}</span>
            <p className="text-white font-medium mt-2">{item.label}</p>

            {/* Feedback icons */}
            {selectedItem?.id === item.id && feedback === 'correct' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
            {selectedItem?.id === item.id && feedback === 'wrong' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
              >
                <X className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Feedback message */}
      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center"
          >
            <p className="text-green-400 font-bold text-lg">✨ Correct! +15 coins</p>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center"
          >
            <p className="text-red-400 font-bold">Try again!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Backpack button */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <Button
          variant="outline"
          className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        >
          <Backpack className="w-5 h-5 mr-2" />
          My Backpack (Word Bank)
        </Button>
      </div>
    </div>
  );
}