"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Medal } from "lucide-react";

export default function JournalLeaderboard({ entries = [] }) {
  // Calculate consecutive days for each user
  const userStreaks = {};

  entries.forEach(entry => {
    const userKey = entry.created_by;
    if (!userStreaks[userKey]) {
      userStreaks[userKey] = {
        name: entry.author_name || "Anonymous",
        email: entry.created_by,
        maxStreak: 0,
        dates: []
      };
    }
    userStreaks[userKey].dates.push(entry.date);
  });

  // Calculate max consecutive days for each user
  Object.values(userStreaks).forEach(user => {
    const sortedDates = user.dates.sort();
    let currentStreak = 1;
    let maxStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    user.maxStreak = maxStreak;
  });

  // Sort by max streak
  const topUsers = Object.values(userStreaks)
    .sort((a, b) => b.maxStreak - a.maxStreak)
    .slice(0, 5);

  if (topUsers.length === 0) return null;

  const getMedalEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="text-white font-bold">🔥 Journal Streak Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {topUsers.map((user, idx) => (
          <motion.div
            key={user.email}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-lg ${
              idx === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' :
              idx === 1 ? 'bg-slate-300/20 border border-slate-300/50' :
              idx === 2 ? 'bg-orange-400/20 border border-orange-400/50' :
              'bg-white/5 border border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getMedalEmoji(idx)}</span>
              <div>
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-white/60 text-xs">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-bold text-lg">{user.maxStreak}</span>
              <span className="text-white/60 text-xs">days</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
