import React from "react";
import { motion } from "framer-motion";
import { Baby, School, Briefcase, Heart, Trophy, GraduationCap, Lock, Check } from "lucide-react";

const milestones = [
  { age: 3, label: "Baby", icon: Baby, color: "bg-pink-500" },
  { age: 5, label: "School", icon: School, color: "bg-blue-500" },
  { age: 13, label: "Bar/Bat Mitzvah", icon: GraduationCap, color: "bg-purple-500" },
  { age: 18, label: "Adult", icon: Briefcase, color: "bg-green-500" },
  { age: 21, label: "Independence", icon: Heart, color: "bg-red-500" },
  { age: 25, label: "Success", icon: Trophy, color: "bg-yellow-500" },
];

export default function TimelineBar({ currentAge = 3 }) {
  const progress = Math.min(100, ((currentAge - 3) / 22) * 100);

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

          {/* Milestone markers */}
          <div className="flex justify-between mt-2">
            {milestones.map((milestone) => {
              const isReached = currentAge >= milestone.age;
              const isCurrent = currentAge >= milestone.age && (milestones.find(m => m.age > milestone.age)?.age || 26) > currentAge;
              
              return (
                <div key={milestone.age} className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isReached 
                        ? `${milestone.color} shadow-lg` 
                        : 'bg-white/10'
                    } ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                  >
                    {isReached ? (
                      <milestone.icon className="w-4 h-4 text-white" />
                    ) : (
                      <Lock className="w-3 h-3 text-white/40" />
                    )}
                  </motion.div>
                  <span className={`text-xs mt-1 ${isReached ? 'text-white' : 'text-white/40'}`}>
                    {milestone.age}
                  </span>
                  <span className={`text-xs hidden sm:block ${isReached ? 'text-white/80' : 'text-white/30'}`}>
                    {milestone.label}
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