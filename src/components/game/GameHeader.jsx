import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Baby, Sparkles, Trophy, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const GameHeader = React.memo(function GameHeader({ profile, coins, onBuyCoins, onSelectLevel }) {
  const navigate = useNavigate();
  const [showLevels, setShowLevels] = useState(false);
  const xpToNextLevel = 1000;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  const levels = [
    { 
      id: 1, 
      name: "Level 1", 
      subtitle: "Baby Steps", 
      icon: Baby, 
      gradient: "from-pink-500 to-rose-500",
      activities: [
        { id: "youtube", name: "Watch Youtube video", duration: "1 hour", icon: "📺", page: "BabyVideos" },
        { id: "baby_words", name: "Help baby learn 50 first words and learn sentences", duration: "10 minutes", icon: "👶", page: "BabyVideos" },
        { id: "colors", name: "Learn the colors", duration: "5 minutes", icon: "🎨", page: "ColorsLesson" },
        { id: "body_parts", name: "Learn body parts", duration: "5 minutes", icon: "🦵", page: "BodyPartsLesson" },
        { id: "days", name: "Learn days of the week", duration: "5 minutes", icon: "📅", page: "DaysLesson" },
        { id: "months", name: "Learn months of the year", duration: "5 minutes", icon: "🗓️", page: "MonthsLesson" },
        { id: "blessing", name: "Learn a Jewish blessing in Hebrew", duration: "5 minutes", icon: "✡️", page: "Progress" },
        { id: "song_level1", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 1 },
      ]
    },
    { 
      id: 2, 
      name: "Level 2", 
      subtitle: "Growing Up", 
      icon: Star, 
      gradient: "from-amber-500 to-orange-500",
      activities: [
        { id: "song_level2", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 2 },
      ]
    },
    { 
      id: 3, 
      name: "Level 3", 
      subtitle: "Explorer", 
      icon: Sparkles, 
      gradient: "from-green-500 to-emerald-500",
      activities: [
        { id: "song_level3", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 3 },
      ]
    },
    { id: 4, name: "Level 4", subtitle: "Adventurer", icon: Trophy, gradient: "from-blue-500 to-indigo-500", activities: [] },
    { id: 5, name: "Level 5", subtitle: "Master", icon: Star, gradient: "from-purple-500 to-violet-500", activities: [] },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Avatar & Level */}
        <div className="relative flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => setShowLevels(!showLevels)}
            className="relative"
          >
            <div className={`w-12 h-12 flex items-center justify-center text-3xl ${profile?.avatar_id === 'jordan' ? 'hue-rotate-[320deg]' : ''}`}>
              {['alex', 'jordan', 'sam'].includes(profile?.avatar_id) ? '🧍‍♂️' : '🧍‍♀️'}
              {!profile?.avatar_id && '👤'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-2 py-0.5 text-xs font-bold text-black">
              {profile?.age_level || 5}
            </div>
          </motion.button>
          <div className="hidden md:block">
            <p className="text-white font-bold">{profile?.avatar_name || 'Player'}</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-xs text-white/60">{profile?.xp || 0} XP</span>
            </div>
          </div>

          {/* Levels Dropdown */}
          <AnimatePresence>
            {showLevels && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl z-50 min-w-[200px]"
              >
                <p className="text-white/60 text-xs mb-2">Choose Your Level</p>
                <div className="space-y-2">
                  {levels.map((level) => {
                    const Icon = level.icon;
                    
                    return (
                      <motion.button
                        key={level.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setShowLevels(false);
                          if (onSelectLevel) onSelectLevel(level);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r ${level.gradient} hover:opacity-80 transition-all`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                        <div className="text-left">
                          <p className="text-white font-bold text-sm">{level.name}</p>
                          <p className="text-white/80 text-xs">{level.subtitle}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {/* Streak */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/50 rounded-xl px-3 py-2"
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="font-bold text-orange-400">{profile?.daily_streak || 0}</span>
          </motion.div>

          {/* Backpack */}
          <Link to={createPageUrl("Backpack")}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl px-4 py-2"
            >
              <span className="text-lg">🎒</span>
              <span className="font-bold text-amber-400">My Backpack</span>
            </motion.div>
          </Link>

          {/* Journal */}
          <Link to={createPageUrl("Journal")}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 rounded-xl px-3 py-2"
            >
              <BookOpen className="w-5 h-5 text-purple-400" />
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default GameHeader;