import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const avatars = [
  { id: "alex", name: "Alex", gender: "male", personality: "Adventurous & Bold", image: "🧍‍♂️", color: "from-blue-500 to-cyan-500", desc: "Loves sports and outdoor activities", traits: ["athletic", "competitive"], outfit: "casual" },
  { id: "maya", name: "Maya", gender: "female", personality: "Creative & Artistic", image: "🧍‍♀️", color: "from-pink-500 to-rose-500", desc: "Passionate about art and music", traits: ["creative", "dreamy"], outfit: "artistic" },
  { id: "jordan", name: "Jordan", gender: "male", personality: "Fabulous & Stylish", image: "🧍‍♂️", color: "from-fuchsia-500 to-pink-400", desc: "Fashion-forward trendsetter", traits: ["stylish", "confident"], special: "pink", outfit: "pink_shirt" },
  { id: "sam", name: "Sam", gender: "male", personality: "Nerdy & Curious", image: "🧍‍♂️", color: "from-violet-500 to-purple-500", desc: "Tech enthusiast and bookworm", traits: ["smart", "curious"], outfit: "nerdy" },
  { id: "zoe", name: "Zoe", gender: "female", personality: "Sporty & Energetic", image: "🧍‍♀️", color: "from-green-500 to-emerald-500", desc: "Always on the move", traits: ["energetic", "social"], outfit: "sporty" },
  { id: "luna", name: "Luna", gender: "female", personality: "Mysterious & Deep", image: "🧍‍♀️", color: "from-indigo-500 to-purple-600", desc: "Philosophical thinker", traits: ["thoughtful", "spiritual"], outfit: "elegant" },
];

export default function AvatarSelect() {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarName, setAvatarName] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate(createPageUrl("Home"));
    },
  });

  const handleContinue = () => {
    if (step === 1 && selectedAvatar) {
      setStep(2);
    } else if (step === 2 && avatarName.trim()) {
      createProfileMutation.mutate({
        avatar_id: selectedAvatar.id,
        avatar_name: avatarName,
        age_level: 5,
        xp: 0,
        daily_streak: 0,
        badges: [],
        interests: selectedAvatar.traits,
        difficulty_level: "beginner",
        total_words_learned: 0,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
            animate={{
              y: [null, Math.random() * -500],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            LifeLanguage
          </h1>
          <p className="text-xl text-white/70">Raise your avatar. Learn a language. Live the journey.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your Character</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {avatars.map((avatar) => (
                  <motion.button
                    key={avatar.id}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`relative p-6 rounded-2xl border-2 transition-all ${
                      selectedAvatar?.id === avatar.id
                        ? 'border-cyan-400 bg-white/20 shadow-lg shadow-cyan-500/30'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {selectedAvatar?.id === avatar.id && (
                      <motion.div
                        layoutId="selected"
                        className="absolute inset-0 rounded-2xl border-2 border-cyan-400"
                      />
                    )}
                    <div className="h-32 flex items-end justify-center mb-3">
                      <div className={`text-7xl ${avatar.special === 'pink' ? 'hue-rotate-[320deg]' : ''}`}>
                        {avatar.image}
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-lg">{avatar.name}</h3>
                    <p className="text-white/60 text-sm">{avatar.personality}</p>
                    <p className="text-white/40 text-xs mt-1">{avatar.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
            >
              <div className={`h-40 flex items-end justify-center mb-6 ${selectedAvatar.special === 'pink' ? 'hue-rotate-[320deg]' : ''}`}>
                <span className="text-9xl">{selectedAvatar.image}</span>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Name Your Character</h2>
              <p className="text-white/60 text-center mb-6">They're just a kid now, but with your help they'll grow!</p>
              <Input
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="Enter a name..."
                className="bg-white/10 border-white/30 text-white text-center text-xl py-6 mb-4"
              />
              <div className="text-center text-white/50 text-sm">
                <span className="inline-block px-3 py-1 bg-white/10 rounded-full">Age: 5 years old</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-4 mt-8"
        >
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              ← Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={step === 1 ? !selectedAvatar : !avatarName.trim()}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg shadow-purple-500/30"
          >
            {step === 1 ? "Continue" : "Start Journey"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}