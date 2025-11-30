import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Cookie, Moon, Bath, Gamepad2, Heart, Volume2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const needs = [
  { 
    id: "water", 
    icon: Droplets, 
    color: "from-blue-400 to-cyan-400",
    hebrew: "מים",
    transliteration: "Mayim",
    meaning: "Water",
    phrase: "אני רוצה מים",
    phraseTranslit: "Ani rotzeh mayim",
    phraseMeaning: "I want water",
    action: "Give Water"
  },
  { 
    id: "food", 
    icon: Cookie, 
    color: "from-amber-400 to-orange-400",
    hebrew: "אוכל",
    transliteration: "Ochel",
    meaning: "Food",
    phrase: "אני רעב",
    phraseTranslit: "Ani ra'ev",
    phraseMeaning: "I am hungry",
    action: "Feed"
  },
  { 
    id: "sleep", 
    icon: Moon, 
    color: "from-indigo-400 to-purple-400",
    hebrew: "לישון",
    transliteration: "Lishon",
    meaning: "To sleep",
    phrase: "אני עייף",
    phraseTranslit: "Ani ayef",
    phraseMeaning: "I am tired",
    action: "Put to Sleep"
  },
  { 
    id: "bathroom", 
    icon: Bath, 
    color: "from-teal-400 to-emerald-400",
    hebrew: "שירותים",
    transliteration: "Sherutim",
    meaning: "Bathroom",
    phrase: "אני צריך שירותים",
    phraseTranslit: "Ani tzarich sherutim",
    phraseMeaning: "I need the bathroom",
    action: "Take to Bathroom"
  },
  { 
    id: "play", 
    icon: Gamepad2, 
    color: "from-pink-400 to-rose-400",
    hebrew: "לשחק",
    transliteration: "Lesachek",
    meaning: "To play",
    phrase: "אני רוצה לשחק",
    phraseTranslit: "Ani rotzeh lesachek",
    phraseMeaning: "I want to play",
    action: "Give Toy"
  },
  { 
    id: "hug", 
    icon: Heart, 
    color: "from-red-400 to-pink-400",
    hebrew: "חיבוק",
    transliteration: "Chibuk",
    meaning: "Hug",
    phrase: "אני צריך חיבוק",
    phraseTranslit: "Ani tzarich chibuk",
    phraseMeaning: "I need a hug",
    action: "Comfort Baby"
  },
];

export default function ToddlerNeeds({ onComplete, avatarName }) {
  const [activeNeed, setActiveNeed] = useState(null);
  const [showLearning, setShowLearning] = useState(false);

  const handleNeedClick = (need) => {
    setActiveNeed(need);
    setShowLearning(true);
  };

  const handleComplete = () => {
    setShowLearning(false);
    if (onComplete) onComplete(activeNeed);
    setActiveNeed(null);
  };

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          🍼 {avatarName} needs your help!
        </h3>
        <p className="text-white/60 text-sm">Tap what the baby needs and learn Hebrew words</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {needs.map((need) => (
          <motion.button
            key={need.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleNeedClick(need)}
            className={`bg-gradient-to-br ${need.color} rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all`}
          >
            <need.icon className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-bold text-sm">{need.meaning}</p>
            <p className="text-white/80 text-xs">{need.hebrew}</p>
          </motion.button>
        ))}
      </div>

      {/* Learning Dialog */}
      <Dialog open={showLearning} onOpenChange={setShowLearning}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Learn & Help {avatarName}!
            </DialogTitle>
          </DialogHeader>

          {activeNeed && (
            <div className="space-y-6">
              {/* Word */}
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-4xl font-bold text-cyan-400 mb-2" dir="rtl">{activeNeed.hebrew}</p>
                <p className="text-lg text-white">{activeNeed.transliteration}</p>
                <p className="text-white/60">{activeNeed.meaning}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playAudio(activeNeed.hebrew)}
                  className="mt-2 text-cyan-400"
                >
                  <Volume2 className="w-4 h-4 mr-1" /> Listen
                </Button>
              </div>

              {/* Phrase */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                <p className="text-sm text-purple-300 mb-1">Baby says:</p>
                <p className="text-xl font-bold text-white" dir="rtl">{activeNeed.phrase}</p>
                <p className="text-white/70">{activeNeed.phraseTranslit}</p>
                <p className="text-white/50 text-sm">"{activeNeed.phraseMeaning}"</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playAudio(activeNeed.phrase)}
                  className="mt-2 text-purple-400"
                >
                  <Volume2 className="w-4 h-4 mr-1" /> Listen to phrase
                </Button>
              </div>

              {/* Action button */}
              <Button
                onClick={handleComplete}
                className={`w-full bg-gradient-to-r ${activeNeed.color} text-white font-bold py-6 text-lg rounded-xl`}
              >
                {activeNeed.action} (+15 coins, +10 XP)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}