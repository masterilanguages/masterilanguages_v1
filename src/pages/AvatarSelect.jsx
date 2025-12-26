import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const avatars = [
  { id: "turtle", type: "turtle", emoji: "🐢", label: "Turtle" },
  { id: "rabbit", type: "rabbit", emoji: "🐰", label: "Rabbit" },
  { id: "fox", type: "fox", emoji: "🦊", label: "Fox" },
  { id: "bear", type: "bear", emoji: "🐻", label: "Bear" },
  { id: "bird", type: "bird", emoji: "🐦", label: "Bird" },
  { id: "cat", type: "cat", emoji: "🐱", label: "Cat" },
  { id: "boy", type: "boy", emoji: "👦", label: "Boy" },
  { id: "girl", type: "girl", emoji: "👧", label: "Girl" },
];

const nameExamples = {
  turtle: ["Penny", "Saver", "SlowPay"],
  rabbit: ["Bucks", "QuickCoin", "HopPay"],
  fox: ["Clever", "Minty", "Coinny"],
  bear: ["Goldie", "Banky", "BigEarn"],
  bird: ["NestEgg", "FlyPay", "Chirpy"],
  cat: ["Lucky", "Whisker", "Coinny"],
  boy: ["Lucky", "PayDay", "Buddy"],
  girl: ["Lucky", "PayDay", "Buddy"],
  custom: ["Earnie", "Value", "Return"],
};

const descriptionExamples = [
  "A calm turtle that earns rewards by showing up every day",
  "A playful fox that's clever and loves earning back",
  "A friendly creature that grows with discipline and consistency",
];

export default function AvatarSelect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: avatar, 2: description (custom), 3: preview (custom), 4: name
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customDescription, setCustomDescription] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [suggestedNames, setSuggestedNames] = useState([]);
  const [generatingNames, setGeneratingNames] = useState(false);
  const [previewBlink, setPreviewBlink] = useState(false);

  const createProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      const existingProfiles = await base44.entities.UserProfile.list();
      if (existingProfiles.length > 0) {
        return await base44.entities.UserProfile.update(existingProfiles[0].id, profileData);
      }
      return await base44.entities.UserProfile.create(profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate(createPageUrl("Home"));
      toast.success("Welcome! Let's start learning! 🌱");
    },
  });

  const handleAvatarSelect = async (avatar) => {
    setSelectedAvatar(avatar);
    
    if (avatar.id === "custom") {
      setStep(2);
    } else {
      setStep(4); // Go directly to name for preset avatars
      // Generate name suggestions
      const examples = nameExamples[avatar.type] || nameExamples.custom;
      setSuggestedNames(examples);
    }
  };

  const handleCustomDescriptionDone = async () => {
    if (!customDescription.trim()) {
      toast.error("Please describe your avatar");
      return;
    }
    
    setGeneratingNames(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this avatar description: "${customDescription}"
        
Generate 3 short, fun, motivational names (max 8 characters each) that relate to earning, saving, or progress. 
Names should be positive, easy to pronounce in English/Spanish, and have money/reward energy.

Examples: Penny, Bucks, Clever, NestEgg, Lucky, Earnie, Value`,
        response_json_schema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      
      setSuggestedNames(result.names || nameExamples.custom);
    } catch (e) {
      setSuggestedNames(nameExamples.custom);
    }
    setGeneratingNames(false);
    setStep(3); // Go to preview for custom avatars
  };

  // Blink animation for preview
  React.useEffect(() => {
    if (step === 3) {
      const blinkInterval = setInterval(() => {
        setPreviewBlink(true);
        setTimeout(() => setPreviewBlink(false), 150);
      }, Math.random() * 6000 + 6000); // 6-12 seconds
      return () => clearInterval(blinkInterval);
    }
  }, [step]);

  const handleFinish = () => {
    if (!avatarName.trim()) {
      toast.error("Please name your avatar");
      return;
    }
    
    createProfileMutation.mutate({
      avatar_id: selectedAvatar.id,
      avatar_type: selectedAvatar.type,
      avatar_name: avatarName,
      avatar_description: selectedAvatar.id === "custom" ? customDescription : null,
      growth_stage: "starter",
      age_level: 3,
      xp: 0,
      daily_streak: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Choose your avatar
                </h1>
                <p className="text-xl text-white/90">
                  They grow as you show up 🌱
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {avatars.map((avatar) => (
                  <motion.button
                    key={avatar.id}
                    onClick={() => handleAvatarSelect(avatar)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-8 rounded-3xl bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-white/40 transition-all"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-7xl mb-3"
                    >
                      {avatar.emoji}
                    </motion.div>
                    <p className="text-white font-semibold text-lg">
                      {avatar.label}
                    </p>
                  </motion.button>
                ))}

                {/* Create Your Own */}
                <motion.button
                  onClick={() => handleAvatarSelect({ id: "custom", type: "custom", emoji: "✨", label: "Create Your Own" })}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-8 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-sm border-2 border-yellow-400/40 hover:border-yellow-400/60 transition-all"
                >
                  <Sparkles className="w-16 h-16 mx-auto mb-3 text-yellow-300" />
                  <p className="text-white font-semibold text-lg">
                    Create Your Own
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    Design a cute character
                  </p>
                </motion.button>
              </div>

              <p className="text-center text-white/60 text-sm">
                Don't worry — you can change this later.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Describe your avatar
                </h1>
                <p className="text-xl text-white/90">
                  Keep it cute, friendly, and motivating.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6">
                <p className="text-white/80 text-sm mb-3">Choose your player:</p>
                <div className="space-y-2 mb-4">
                  {descriptionExamples.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCustomDescription(example)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white text-sm transition-all"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>

                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe your own character"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[100px]"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 py-6 text-lg border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCustomDescriptionDone}
                  disabled={!customDescription.trim() || generatingNames}
                  className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg disabled:opacity-50"
                >
                  {generatingNames ? "Generating..." : "Next"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedAvatar?.id === "custom" && (
            <motion.div
              key="step3-preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Preview Your Avatar
                </h1>
                <p className="text-xl text-white/90">
                  Your custom learning buddy
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-6 flex flex-col items-center">
                {/* Avatar Preview */}
                <motion.div
                  animate={{ 
                    scale: previewBlink ? [1, 1, 1] : [1, 1.02, 1],
                    scaleY: previewBlink ? 0.1 : 1
                  }}
                  transition={{ 
                    scale: { duration: 2, repeat: Infinity },
                    scaleY: { duration: 0.1 }
                  }}
                  className="text-9xl mb-6"
                >
                  ✨
                </motion.div>

                <div className="bg-white/5 rounded-xl p-4 max-w-md">
                  <p className="text-white/60 text-sm mb-1">Description:</p>
                  <p className="text-white">{customDescription}</p>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 py-6 text-lg border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                >
                  Edit description
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg"
                >
                  Use this player
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-8xl mb-4"
                >
                  {selectedAvatar?.emoji}
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Name your avatar
                </h1>
                <p className="text-xl text-white/90">
                  Pick a fun name that reminds you to earn it back 💰
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6">
                <p className="text-white/80 text-sm mb-3">Suggested names:</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {suggestedNames.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAvatarName(name)}
                      className={`p-3 rounded-xl border transition-all ${
                        avatarName === name
                          ? 'bg-yellow-400/30 border-yellow-400 text-white font-bold'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <p className="text-white/60 text-sm mb-2">Or type your own:</p>
                <Input
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="Max 8 characters"
                  maxLength={8}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 text-lg"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(selectedAvatar?.id === "custom" ? 3 : 1)}
                  variant="outline"
                  className="flex-1 py-6 text-lg border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!avatarName.trim() || createProfileMutation.isPending}
                  className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg disabled:opacity-50"
                >
                  {createProfileMutation.isPending ? "Starting..." : "Let's go!"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}