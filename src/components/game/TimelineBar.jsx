import React from "react";
import { motion } from "framer-motion";
import { Baby, School, Briefcase, Heart, Trophy, GraduationCap, Lock, Check } from "lucide-react";

const levels = [
  { level: 1, ageStart: 3, ageEnd: 5, label: "Level 1", icon: Baby, color: "bg-pink-500" },
  { level: 2, ageStart: 5, ageEnd: 13, label: "Level 2", icon: School, color: "bg-blue-500" },
  { level: 3, ageStart: 13, ageEnd: 18, label: "Level 3", icon: GraduationCap, color: "bg-purple-500" },
  { level: 4, ageStart: 18, ageEnd: 21, label: "Level 4", icon: Briefcase, color: "bg-green-500" },
  { level: 5, ageStart: 21, ageEnd: 100, label: "Level 5", icon: Trophy, color: "bg-yellow-500" },
];

export default function TimelineBar({ currentAge = 3 }) {
  const currentLevel = levels.find(l => currentAge >= l.ageStart && currentAge < l.ageEnd) || levels[levels.length - 1];
  const progress = Math.min(100, ((currentLevel.level - 1) / (levels.length - 1)) * 100 + 
    ((currentAge - currentLevel.ageStart) / (currentLevel.ageEnd - currentLevel.ageStart)) * (100 / (levels.length - 1)));

  return (
    <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="max-w-5xl mx-auto">
        <div className="relative">
          {/* Progress track */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
            />
          </div>

          {/* Level markers */}
          <div className="flex justify-between mt-2">
            {levels.map((level) => {
              const isReached = currentAge >= level.ageStart;
              const isCurrent = currentAge >= level.ageStart && currentAge < level.ageEnd;
              
              return (
                <div key={level.level} className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isReached 
                        ? `${level.color} shadow-lg` 
                        : 'bg-white/10'
                    } ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                  >
                    {isReached ? (
                      <level.icon className="w-4 h-4 text-white" />
                    ) : (
                      <Lock className="w-3 h-3 text-white/40" />
                    )}
                  </motion.div>
                  <span className={`text-xs mt-1 font-bold ${isReached ? 'text-white' : 'text-white/40'}`}>
                    {level.level}
                  </span>
                  <span className={`text-xs hidden sm:block ${isReached ? 'text-white/80' : 'text-white/30'}`}>
                    {level.ageStart}-{level.ageEnd === 100 ? '∞' : level.ageEnd}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}