import React from "react";
import { motion } from "framer-motion";

const avatarDetails = {
  alex: { image: "🧍‍♂️", color: "from-blue-500 to-cyan-500" },
  maya: { image: "🧍‍♀️", color: "from-pink-500 to-rose-500" },
  jordan: { image: "🧍‍♂️", color: "from-fuchsia-500 to-pink-400", special: "pink" },
  sam: { image: "🧍‍♂️", color: "from-violet-500 to-purple-500" },
  zoe: { image: "🧍‍♀️", color: "from-green-500 to-emerald-500" },
  luna: { image: "🧍‍♀️", color: "from-indigo-500 to-purple-600" },
};

const ageAppearance = (age) => {
  if (age <= 7) return { scale: 0.6, label: "Kid" };
  if (age <= 12) return { scale: 0.75, label: "Child" };
  if (age <= 17) return { scale: 0.9, label: "Teen" };
  if (age <= 21) return { scale: 1, label: "Young Adult" };
  return { scale: 1, label: "Adult" };
};

export default function AvatarDisplay({ profile, equippedItem, className = "" }) {
  const avatar = avatarDetails[profile?.avatar_id] || avatarDetails.alex;
  const appearance = ageAppearance(profile?.age_level || 5);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative ${className}`}
    >
      {/* Glow effect behind avatar */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${avatar.color} blur-3xl opacity-20`}
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Full body avatar */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="relative flex flex-col items-center"
      >
        <div 
          className={`relative ${avatar.special === 'pink' ? 'hue-rotate-[320deg]' : ''}`}
          style={{ transform: `scale(${appearance.scale})`, transformOrigin: 'bottom center' }}
        >
          <span className="text-[120px] leading-none">{avatar.image}</span>
        </div>

        {/* Equipped item */}
        {equippedItem && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute top-0 right-0 text-4xl"
          >
            {equippedItem.emoji}
          </motion.div>
        )}

        {/* Age badge */}
        <div className="mt-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-4 py-1 shadow-lg">
          <span className="font-bold text-black">{profile?.age_level || 5} yrs</span>
        </div>
      </motion.div>

      {/* Name & stage */}
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-white">{profile?.avatar_name || 'Avatar'}</h2>
        <p className="text-white/60">{appearance.label}</p>
      </div>
    </motion.div>
  );
}