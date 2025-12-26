import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, X, Loader2, Plus, ChevronUp, Flame, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const avatarEmojis = {
  turtle: "🐢", rabbit: "🐰", fox: "🦊", bear: "🐻",
  bird: "🐦", cat: "🐱", boy: "👦", girl: "👧", custom: "✨"
};

const growthStageEmojis = {
  starter: "🌱", growing: "🌿", rising: "🌳", pro: "⭐"
};

const emotionMessages = {
  neutral: "Ready to earn?",
  happy: "That counts!",
  proud: "You earned today back!",
  tired: "Tomorrow's reward is waiting.",
  motivated: "Let's earn together!"
};

export default function BuddyDock({ profile, coins, backpackCount }) {
  const queryClient = useQueryClient();
  const [isBlinking, setIsBlinking] = useState(false);
  const [showBuddyPanel, setShowBuddyPanel] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Random blink every 6-12 seconds
  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = Math.random() * 6000 + 6000;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleNextBlink();
      }, delay);
    };
    
    const timeout = scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Added to backpack! 🎒");
      setTranslation(null);
      setInputText("");
    },
  });

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setIsTranslating(true);
    try {
      const isEnglish = /^[a-zA-Z\s\.,!?'-]+$/.test(inputText.trim());
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: isEnglish 
          ? `Translate "${inputText}" to modern Israeli Hebrew. Provide: hebrew, transliteration, alternatives (array), notes.`
          : `Translate Hebrew/transliteration "${inputText}" to English. Provide: english, hebrew, transliteration, alternatives (array).`,
        response_json_schema: {
          type: "object",
          properties: isEnglish 
            ? { hebrew: { type: "string" }, transliteration: { type: "string" }, alternatives: { type: "array", items: { type: "string" } }, notes: { type: "string" } }
            : { english: { type: "string" }, hebrew: { type: "string" }, transliteration: { type: "string" }, alternatives: { type: "array", items: { type: "string" } } }
        }
      });
      
      setTranslation({ ...result, direction: isEnglish ? 'en-he' : 'tr-en' });
    } catch (e) {
      toast.error("Translation failed");
    }
    setIsTranslating(false);
  };

  const handleAddToBackpack = () => {
    if (!translation) return;
    createWordMutation.mutate({
      word: translation.hebrew,
      translation: translation.english,
      phonetic: translation.transliteration,
      category: "wordbank",
      times_practiced: 0,
      mastered: false,
    });
  };

  if (!profile) return null;

  const avatarEmoji = avatarEmojis[profile.avatar_type] || avatarEmojis.custom;
  const growthEmoji = growthStageEmojis[profile.growth_stage] || "🌱";
  const message = emotionMessages[profile.emotion_state] || emotionMessages.neutral;
  
  // Use starter avatar for custom avatars that are resolving
  const showStarterAvatar = profile.avatar_type === "custom" && profile.avatar_status === "resolving";
  const avatarDisplay = showStarterAvatar ? (
    <div className="w-10 h-auto md:w-12 md:h-auto flex items-end justify-center overflow-visible">
      <span className="text-3xl md:text-4xl">😊</span>
    </div>
  ) : profile.avatar_image_url && profile.avatar_type === "custom" ? (
    <img 
      src={profile.avatar_image_url} 
      alt={profile.avatar_name} 
      className="w-10 h-auto md:w-12 md:h-auto object-contain" 
      style={{ borderRadius: 0, clipPath: 'none', mask: 'none' }}
    />
  ) : (
    <span className="text-3xl md:text-4xl">{avatarEmoji}</span>
  );

  return (
    <>
      {/* Dock Container */}
      <div className="fixed bottom-4 right-4 md:right-6 z-50 flex items-end gap-2">
        {/* Avatar */}
        <motion.button
          onClick={() => setShowBuddyPanel(!showBuddyPanel)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-2xl hover:border-white/50 transition-all p-2 md:p-3 flex items-end justify-center overflow-visible"
        >
          <motion.div
            animate={isBlinking ? { scaleY: 0.1 } : { scaleY: 1, y: [0, -2, 0] }}
            transition={isBlinking ? { duration: 0.1 } : { duration: 2, repeat: Infinity }}
          >
            {avatarDisplay}
          </motion.div>

          {/* Growth badge */}
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            <span className="text-xs">{growthEmoji}</span>
          </div>
        </motion.button>

        {/* Translator Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTranslator(!showTranslator)}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xl flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-all"
        >
          {showTranslator ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <Languages className="w-5 h-5 md:w-6 md:h-6" />}
        </motion.button>
      </div>

      {/* Buddy Panel */}
      <AnimatePresence>
        {showBuddyPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-24 right-4 md:right-6 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-auto flex items-end justify-center overflow-visible">
                  {showStarterAvatar ? (
                    <span className="text-3xl">😊</span>
                  ) : profile.avatar_image_url && profile.avatar_type === "custom" ? (
                    <img 
                      src={profile.avatar_image_url} 
                      alt={profile.avatar_name} 
                      className="w-full h-auto object-contain" 
                      style={{ borderRadius: 0, clipPath: 'none', mask: 'none' }}
                    />
                  ) : (
                    <span className="text-3xl">{avatarEmoji}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">{profile.avatar_name}</p>
                  <p className="text-xs text-white/60 capitalize">{profile.growth_stage}</p>
                </div>
              </div>
              <button onClick={() => setShowBuddyPanel(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-white/80 text-sm">Streak</span>
                </div>
                <span className="font-bold text-orange-400">{profile.daily_streak || 0} days</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎒</span>
                  <span className="text-white/80 text-sm">Backpack</span>
                </div>
                <span className="font-bold text-cyan-400">{backpackCount || 0} words</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span className="text-white/80 text-sm">Coins</span>
                </div>
                <span className="font-bold text-yellow-400">{coins || 0}</span>
              </div>
            </div>

            <div className="mt-4 bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
              <p className="text-purple-300 text-sm text-center font-medium">
                💬 {message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translator Panel */}
      <AnimatePresence>
        {showTranslator && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-24 right-4 md:right-6 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex gap-2 mb-3">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="English or Hebrew..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
              />
              <Button
                onClick={handleTranslate}
                disabled={!inputText.trim() || isTranslating}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
              </Button>
            </div>

            {translation && (
              <>
                <div className="space-y-2 mb-3">
                  {translation.direction === 'en-he' ? (
                    <>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/60 text-[10px] mb-1">HEBREW</p>
                        <p className="text-cyan-400 text-lg font-bold" dir="rtl">{translation.hebrew}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/60 text-[10px] mb-1">PRONUNCIATION</p>
                        <p className="text-white">{translation.transliteration}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/60 text-[10px] mb-1">ENGLISH</p>
                        <p className="text-green-400 text-lg font-bold">{translation.english}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/60 text-[10px] mb-1">HEBREW</p>
                        <p className="text-cyan-400 font-bold" dir="rtl">{translation.hebrew}</p>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  onClick={handleAddToBackpack}
                  disabled={createWordMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Backpack
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}