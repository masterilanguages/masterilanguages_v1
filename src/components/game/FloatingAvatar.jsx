import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const avatarEmojis = {
  turtle: "🐢",
  rabbit: "🐰",
  fox: "🦊",
  bear: "🐻",
  bird: "🐦",
  cat: "🐱",
  boy: "👦",
  girl: "👧",
  custom: "✨"
};

const expressions = {
  neutral: { emoji: "😊", message: "Ready to earn?" },
  happy: { emoji: "😄", message: "That counts!" },
  proud: { emoji: "🌟", message: "You earned today back!" },
  tired: { emoji: "😴", message: "Tomorrow's reward is waiting." },
  motivated: { emoji: "💪", message: "Let's earn together!" }
};

export default function FloatingAvatar({ profile, coins }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentExpression, setCurrentExpression] = useState("neutral");
  const [showMessage, setShowMessage] = useState(false);

  // Blink every 3 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Change expression based on activity
  useEffect(() => {
    if (!profile) return;

    if (profile.daily_streak >= 7) {
      setCurrentExpression("proud");
    } else if (profile.xp > 0 && profile.xp % 100 === 0) {
      setCurrentExpression("happy");
    } else if (coins > 1000) {
      setCurrentExpression("motivated");
    } else {
      setCurrentExpression("neutral");
    }
  }, [profile?.daily_streak, profile?.xp, coins]);

  if (!profile) return null;

  const avatarEmoji = avatarEmojis[profile.avatar_type] || avatarEmojis.custom;
  const expression = expressions[currentExpression];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-24 right-4 md:right-6 z-40"
    >
      <div className="relative">
        {/* Avatar */}
        <motion.button
          onClick={() => setShowMessage(!showMessage)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative bg-transparent backdrop-blur-xl border-2 border-white/20 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-lg hover:border-white/40 transition-all"
          style={{ borderRadius: 0 }}
        >
          {profile?.avatar_image_url ? (
            <motion.img
              src={profile.avatar_image_url}
              alt={profile.avatar_name}
              animate={isBlinking ? { scaleY: 0.1 } : { scaleY: 1 }}
              transition={{ duration: 0.1 }}
              className="w-full h-auto object-contain bg-transparent"
              style={{ borderRadius: 0, clipPath: 'none', mask: 'none', backgroundColor: 'transparent' }}
            />
          ) : (
            <motion.div
              animate={isBlinking ? { scaleY: 0.1 } : { scaleY: 1 }}
              transition={{ duration: 0.1 }}
              className="text-3xl md:text-4xl"
            >
              {avatarEmoji}
            </motion.div>
          )}

          {/* Growth stage indicator */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow-lg"
          >
            {profile.growth_stage === "starter" && "🌱"}
            {profile.growth_stage === "growing" && "🌿"}
            {profile.growth_stage === "rising" && "🌳"}
            {profile.growth_stage === "pro" && "⭐"}
          </motion.div>

          {/* Expression overlay */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-2 -right-2 text-xl"
          >
            {expression.emoji}
          </motion.div>
        </motion.button>

        {/* Message bubble */}
        <AnimatePresence>
          {showMessage && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              className="absolute bottom-0 right-20 md:right-24 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-xl border border-white/20 whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-600">{profile.avatar_name}:</span>
                <span className="text-gray-700">{expression.message}</span>
              </div>
              {/* Speech bubble tail */}
              <div className="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white/95" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}