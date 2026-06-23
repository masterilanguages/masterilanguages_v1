"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, Check, Coins, Star } from "lucide-react";

export default function ActivityCard({
  activity,
  isUnlocked,
  completions,
  minAge,
  currentAge,
  canAfford = true,
  onClick
}) {
  const isAgeLocked = currentAge < minAge;
  const canAccess = isUnlocked && !isAgeLocked && canAfford;

  return (
    <motion.div
      whileHover={canAccess ? { scale: 1.03, y: -5 } : {}}
      whileTap={canAccess ? { scale: 0.98 } : {}}
      onClick={() => canAccess && onClick()}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer ${
        canAccess
          ? 'border-white/30 bg-gradient-to-br from-white/10 to-white/5 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20'
          : 'border-white/10 bg-white/5 opacity-60'
      }`}
    >
      {/* Lock indicator at top-left */}
      {!canAccess && (
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
            <Lock className="w-4 h-4 text-white/80" />
          </div>
        </div>
      )}

      {/* Completion badge */}
      {completions > 0 && (
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-green-500/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <Check className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">{completions}x</span>
          </div>
        </div>
      )}

      {/* Glowing background effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${activity.gradient} opacity-20`} />

      {/* Content */}
      <div className="relative p-5">
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center shadow-lg mb-4`}>
          <activity.icon className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-white font-bold text-lg mb-1">{activity.name}</h3>
        <p className="text-white/60 text-sm mb-3">{activity.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-yellow-400">
            <Coins className="w-4 h-4" />
            <span className="font-bold">{activity.cost}</span>
          </div>

          {isAgeLocked ? (
            <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
              Age {minAge}+
            </span>
          ) : !canAfford && (
            <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full">
              Need coins
            </span>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      {canAccess && (
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.div>
  );
}
