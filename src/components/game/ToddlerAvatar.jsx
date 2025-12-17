import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ToddlerAvatar = ({ 
  emotion = "idle", 
  size = "large", 
  onInteraction,
  avatarId = "alex"
}) => {
  const [currentEmotion, setCurrentEmotion] = useState(emotion);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (emotion !== currentEmotion) {
      setCurrentEmotion(emotion);
      playEmotionSound(emotion);
      triggerAnimation();
    }
  }, [emotion]);

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const playEmotionSound = (emotion) => {
    // Sound mappings for different emotions
    const sounds = {
      happy: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3", // Baby laugh
      playful: "https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3", // Clap
      curious: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", // Giggle
    };

    if (sounds[emotion]) {
      const audio = new Audio(sounds[emotion]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  };

  const getAvatarEmoji = () => {
    const avatarMap = {
      alex: "👶",
      jordan: "🧒",
      sam: "👦",
      riley: "👧"
    };
    return avatarMap[avatarId] || "👶";
  };

  const getEmotionStyle = () => {
    const styles = {
      idle: { scale: 1, rotate: 0 },
      happy: { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] },
      curious: { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] },
      playful: { scale: [1, 1.3, 1.1, 1], rotate: [0, 15, -15, 0] },
      excited: { scale: [1, 1.2, 1.2, 1], rotate: [0, 20, -20, 0] }
    };
    return styles[currentEmotion] || styles.idle;
  };

  const getParticles = () => {
    const particles = {
      happy: ["✨", "💛", "⭐"],
      playful: ["🎉", "🎊", "🌟"],
      curious: ["❓", "💭", "🤔"],
      excited: ["🎈", "🎁", "🎯"]
    };
    return particles[currentEmotion] || [];
  };

  const sizeMap = {
    small: "text-6xl",
    medium: "text-8xl",
    large: "text-9xl"
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Avatar */}
      <motion.div
        animate={isAnimating ? getEmotionStyle() : { scale: 1, rotate: 0 }}
        transition={{ 
          duration: 0.8, 
          ease: "easeInOut",
          times: [0, 0.3, 0.7, 1]
        }}
        onClick={() => {
          triggerAnimation();
          onInteraction?.(currentEmotion);
        }}
        className={`${sizeMap[size]} cursor-pointer select-none hover:scale-105 transition-transform`}
      >
        {getAvatarEmoji()}
      </motion.div>

      {/* Emotion Particles */}
      <AnimatePresence>
        {isAnimating && getParticles().map((particle, idx) => (
          <motion.div
            key={`${currentEmotion}-${idx}`}
            initial={{ 
              opacity: 1, 
              scale: 0, 
              x: 0, 
              y: 0 
            }}
            animate={{ 
              opacity: 0, 
              scale: 1.5,
              x: (idx - 1) * 50,
              y: -50 - (idx * 20)
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute text-3xl pointer-events-none"
          >
            {particle}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bounce animation for idle */}
      {!isAnimating && currentEmotion === "idle" && (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute inset-0 -z-10"
        />
      )}
    </div>
  );
};

export default ToddlerAvatar;