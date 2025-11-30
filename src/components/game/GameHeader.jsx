import React from "react";
import { motion } from "framer-motion";
import { Flame, Coins, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GameHeader({ profile, coins, onBuyCoins }) {
  const xpToNextLevel = 1000;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Avatar & Level */}
        <Link to={createPageUrl("Home")} className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <div className={`w-12 h-12 flex items-center justify-center text-3xl ${profile?.avatar_id === 'jordan' ? 'hue-rotate-[320deg]' : ''}`}>
              {['alex', 'jordan', 'sam'].includes(profile?.avatar_id) ? '🧍‍♂️' : '🧍‍♀️'}
              {!profile?.avatar_id && '👤'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-2 py-0.5 text-xs font-bold text-black">
              {profile?.age_level || 5}
            </div>
          </motion.div>
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
        </Link>

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

          {/* Backpack (replaces coins) */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={onBuyCoins}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl px-4 py-2"
                  >
                    <span className="text-lg">🎒</span>
                    <span className="font-bold text-amber-400">My Backpack</span>
                  </motion.button>
        </div>
      </div>
    </div>
  );
}