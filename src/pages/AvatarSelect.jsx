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
  { id: "custom", type: "custom", emoji: "✨", label: "Create Your Own" },
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

const customizationOptions = {
  turtle: {
    traits: ["Round shell", "Star shell", "Simple shell", "Blush cheeks", "No blush"],
    accessories: ["Tiny headphones", "Mini cape", "Coin pouch"],
    vibes: ["Calm", "Steady", "Proud"]
  },
  rabbit: {
    traits: ["Floppy ears", "Tiny ears", "Big eyes", "Sleepy eyes", "Freckles", "No freckles"],
    accessories: ["Hoodie", "Little cap", "Bow tie", "Tiny backpack", "Coin pouch"],
    vibes: ["Playful", "Focused", "Chill", "Determined"]
  },
  fox: {
    traits: ["Fluffy tail", "Sleek tail", "Big eyes", "Sharp eyes", "Pointy ears"],
    accessories: ["Scarf", "Little cap", "Coin pouch", "Tiny backpack"],
    vibes: ["Clever", "Playful", "Focused", "Confident"]
  },
  bear: {
    traits: ["Round ears", "Fuzzy", "Smooth", "Big paws", "Small paws"],
    accessories: ["Hoodie", "Little vest", "Coin pouch", "Tiny backpack"],
    vibes: ["Strong", "Gentle", "Friendly", "Determined"]
  },
  bird: {
    traits: ["Colorful feathers", "Simple feathers", "Big eyes", "Small beak", "Round body"],
    accessories: ["Little cap", "Tiny scarf", "Coin pouch"],
    vibes: ["Cheerful", "Free", "Focused", "Energetic"]
  },
  cat: {
    traits: ["Long tail", "Short tail", "Big eyes", "Sleepy eyes", "Pointy ears", "Round ears"],
    accessories: ["Collar with bell", "Little cap", "Bow tie", "Coin pouch"],
    vibes: ["Curious", "Chill", "Focused", "Playful"]
  },
  boy: {
    traits: ["Curly hair", "Straight hair", "Short hair", "Long hair", "Big eyes", "Soft eyes"],
    accessories: ["Hoodie", "Sporty jacket", "Cozy sweater", "Small backpack", "Coin pouch"],
    vibes: ["Friendly", "Focused", "Confident", "Determined"]
  },
  girl: {
    traits: ["Curly hair", "Straight hair", "Short hair", "Long hair", "Big eyes", "Soft eyes"],
    accessories: ["Hoodie", "Sporty jacket", "Cozy sweater", "Small backpack", "Coin pouch"],
    vibes: ["Friendly", "Focused", "Confident", "Determined"]
  },
  custom: {
    traits: ["Big eyes", "Small eyes", "Round face", "Long body", "Short body", "Fluffy"],
    accessories: ["Hat", "Scarf", "Backpack", "Bow", "Cape", "Coin pouch"],
    vibes: ["Cheerful", "Focused", "Adventurous", "Calm", "Energetic"]
  }
};

export default function AvatarSelect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  useEffect(() => {
    document.title = "Create Avatar - Lashon Languages";
  }, []); // 1: type, 2: describe, 3: choose image, 4: name
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [suggestedNames, setSuggestedNames] = useState([]);
  const [generatingNames, setGeneratingNames] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [generatingAvatars, setGeneratingAvatars] = useState(false);
  const [selectedAvatarImage, setSelectedAvatarImage] = useState(null);
  const [profile, setProfile] = useState(null);

  const loadProfile = async () => {
    const profiles = await base44.entities.UserProfile.list();
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    }
  };

  React.useEffect(() => {
    loadProfile();
  }, []);

  // Redirect to language select if no language chosen
  React.useEffect(() => {
    if (profile && profile.is_new_user && !profile.language) {
      navigate(createPageUrl("LanguageSelect"));
    }
  }, [profile, navigate]);

  const createProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      const currentUser = await base44.auth.me();
      const existingProfiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (existingProfiles.length > 0) {
        return await base44.entities.UserProfile.update(existingProfiles[0].id, profileData);
      }
      return await base44.entities.UserProfile.create(profileData);
    },
    onSuccess: async (data, variables) => {
      const currentUser = await base44.auth.me();
      await queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.email] });

      // Notify admin of new user
      try {
        const currentUser = await base44.auth.me();
        await base44.functions.invoke('notifyNewUser', {
          userEmail: currentUser?.email,
          userName: currentUser?.full_name,
          language: variables.language || profile?.language,
          avatarName: variables.avatar_name
        });
      } catch (e) {
        console.error('Failed to notify admin:', e);
      }

      navigate(createPageUrl("Home"));
      toast.success("Welcome! Let's start learning! 🌱");
    },
  });

  const handleAvatarSelect = async (avatar) => {
    setSelectedAvatar(avatar);
    setSelectedTraits([]);
    setSelectedAccessories([]);
    setSelectedVibe("");
    setExtraDetails("");
    setStep(2); // Always go to description step
  };

  const handleDescriptionDone = async () => {
    if (selectedTraits.length < 1) {
      toast.error("Pick at least 1 trait");
      return;
    }
    if (selectedAccessories.length < 1) {
      toast.error("Pick at least 1 accessory");
      return;
    }
    if (!selectedVibe) {
      toast.error("Pick a vibe");
      return;
    }
    
    setGeneratingNames(true);
    
    const avatarTypeName = selectedAvatar.label;
    const description = `A ${avatarTypeName} with ${selectedTraits.join(", ")}, wearing ${selectedAccessories.join(", ")}, with a ${selectedVibe} vibe. ${extraDetails}`;
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this character: ${avatarTypeName} - ${description}
        
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
      
      setSuggestedNames(result.names || nameExamples[selectedAvatar.type] || nameExamples.custom);
    } catch (e) {
      setSuggestedNames(nameExamples[selectedAvatar.type] || nameExamples.custom);
    }
    setGeneratingNames(false);
    setStep(3);
    
    // Start generating 3 avatar variations
    generateAvatarOptions(description);
  };

  const generateAvatarOptions = async (description) => {
    setGeneratingAvatars(true);
    setAvatarOptions([]);
    
    try {
      const basePrompt = `Create a cute, friendly ${selectedAvatar.label} character avatar with a big head and small body. ${description}. The character should have a warm, approachable expression with visible eyes. Style: cartoon, kawaii, simple shapes, soft colors, clean edges, PG-rated. Character only on transparent background - no text, no icons, no decorative elements, no borders, no circles, no glows. Just the character cutout.`;
      
      // Generate 3 variations
      const promises = [
        base44.integrations.Core.GenerateImage({ prompt: basePrompt + " Variation A: outfit focus." }),
        base44.integrations.Core.GenerateImage({ prompt: basePrompt + " Variation B: expression focus." }),
        base44.integrations.Core.GenerateImage({ prompt: basePrompt + " Variation C: accessory focus." })
      ];
      
      const results = await Promise.all(promises);
      const validImages = results.filter(r => r?.url).map(r => r.url);
      
      if (validImages.length > 0) {
        setAvatarOptions(validImages);
      } else {
        toast.error("Let's try again.");
      }
    } catch (e) {
      console.error("Avatar generation failed:", e);
      toast.error("Let's try again.");
    }
    
    setGeneratingAvatars(false);
  };

  const handleAvatarSelection = (imageUrl) => {
    setSelectedAvatarImage(imageUrl);
    setSelectedAvatar({ ...selectedAvatar, imageUrl, status: "ready" });
    setStep(4); // Go to naming
  };

  const handleFinish = () => {
    if (!avatarName.trim()) {
      toast.error("Please name your avatar");
      return;
    }
    
    const description = `${selectedAvatar.label}: ${selectedTraits.join(", ")}, ${selectedAccessories.join(", ")}, ${selectedVibe} vibe. ${extraDetails}`;
    
    createProfileMutation.mutate({
      avatar_id: selectedAvatar.id,
      avatar_type: selectedAvatar.type,
      avatar_name: avatarName,
      avatar_description: description,
      avatar_image_url: selectedAvatarImage || null,
      avatar_status: "ready",
      growth_stage: "starter",
      age_level: 3,
      xp: 0,
      daily_streak: 0,
      is_new_user: false,
      onboarding_completed_at: new Date().toISOString(),
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
                    className={`relative p-8 rounded-3xl backdrop-blur-sm border-2 transition-all ${
                      avatar.id === 'custom' 
                        ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400/40 hover:border-yellow-400/60'
                        : 'bg-white/10 border-white/20 hover:border-white/40'
                    }`}
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
              </div>

              <p className="text-center text-white/60 text-sm">
                Don't worry — you can change this later.
              </p>
            </motion.div>
          )}

          {step === 2 && selectedAvatar && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-7xl mb-4"
                >
                  {selectedAvatar.emoji}
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Describe your {selectedAvatar.label}
                </h1>
                <p className="text-xl text-white/90">
                  Make it yours. Keep it cute.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6 space-y-6">
                {/* Traits */}
                <div>
                  <p className="text-white/80 text-sm mb-3">Pick traits:</p>
                  <div className="flex flex-wrap gap-2">
                    {customizationOptions[selectedAvatar.type]?.traits.map((trait) => (
                      <button
                        key={trait}
                        onClick={() => {
                          if (selectedTraits.includes(trait)) {
                            setSelectedTraits(selectedTraits.filter(t => t !== trait));
                          } else {
                            setSelectedTraits([...selectedTraits, trait]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl border transition-all ${
                          selectedTraits.includes(trait)
                            ? 'bg-cyan-400/30 border-cyan-400 text-white font-bold'
                            : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <p className="text-white/80 text-sm mb-3">Pick accessory/outfit:</p>
                  <div className="flex flex-wrap gap-2">
                    {customizationOptions[selectedAvatar.type]?.accessories.map((acc) => (
                      <button
                        key={acc}
                        onClick={() => {
                          if (selectedAccessories.includes(acc)) {
                            setSelectedAccessories(selectedAccessories.filter(a => a !== acc));
                          } else {
                            setSelectedAccessories([...selectedAccessories, acc]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl border transition-all ${
                          selectedAccessories.includes(acc)
                            ? 'bg-purple-400/30 border-purple-400 text-white font-bold'
                            : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibe */}
                <div>
                  <p className="text-white/80 text-sm mb-3">Pick vibe:</p>
                  <div className="flex flex-wrap gap-2">
                    {customizationOptions[selectedAvatar.type]?.vibes.map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => setSelectedVibe(vibe)}
                        className={`px-4 py-2 rounded-xl border transition-all ${
                          selectedVibe === vibe
                            ? 'bg-yellow-400/30 border-yellow-400 text-white font-bold'
                            : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra details */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Add any extra details (optional):</p>
                  <Input
                    value={extraDetails}
                    onChange={(e) => setExtraDetails(e.target.value)}
                    placeholder="Any extra details..."
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
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
                  onClick={handleDescriptionDone}
                  disabled={selectedTraits.length < 1 || selectedAccessories.length < 1 || !selectedVibe || generatingNames}
                  className="flex-1 py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg disabled:opacity-50"
                >
                  {generatingNames ? "Generating..." : "Generate"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedAvatar && (
            <motion.div
              key="step3-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Choose your character
                </h1>
                <p className="text-xl text-white/90">
                  Pick the one that feels right.
                </p>
              </div>

              {generatingAvatars ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-16 mb-6 flex flex-col items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full mb-4"
                  />
                  <p className="text-white/80 text-lg">Creating your avatar…</p>
                </div>
              ) : avatarOptions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {avatarOptions.map((imageUrl, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => handleAvatarSelection(imageUrl)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-transparent backdrop-blur-sm rounded-2xl p-6 border-2 border-white/20 hover:border-white/60 hover:shadow-lg transition-all overflow-visible"
                      >
                        <div className="w-full h-auto flex items-end justify-center overflow-visible bg-transparent">
                          <img
                            src={imageUrl}
                            alt={`Avatar option ${idx + 1}`}
                            className="w-full h-auto object-contain bg-transparent"
                            style={{ borderRadius: 0, clipPath: 'none', mask: 'none', backgroundColor: 'transparent' }}
                          />
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="flex-1 py-6 text-lg border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                    >
                      Edit description
                    </Button>
                    <Button
                      onClick={() => {
                        const description = `${selectedAvatar.label}: ${selectedTraits.join(", ")}, ${selectedAccessories.join(", ")}, ${selectedVibe} vibe. ${extraDetails}`;
                        generateAvatarOptions(description);
                      }}
                      variant="outline"
                      className="flex-1 py-6 text-lg border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                    >
                      See more like this
                    </Button>
                  </div>
                </>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-6 text-center">
                  <p className="text-white text-lg mb-4">Let's try again.</p>
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="border-white/30 bg-white/10 text-black font-semibold hover:bg-white/20"
                  >
                    Edit description
                  </Button>
                </div>
              )}
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
                {selectedAvatarImage ? (
                <div className="w-32 h-auto mx-auto mb-4 flex items-end justify-center overflow-visible bg-transparent">
                  <img
                    src={selectedAvatarImage}
                    alt="Selected avatar"
                    className="w-full h-auto object-contain bg-transparent"
                    style={{ borderRadius: 0, clipPath: 'none', mask: 'none', backgroundColor: 'transparent' }}
                  />
                </div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-8xl mb-4"
                  >
                    {selectedAvatar?.emoji}
                  </motion.div>
                )}
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Name your character
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
                  onClick={() => setStep(3)}
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