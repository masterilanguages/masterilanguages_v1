import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Backpack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function QuickAddWordWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Word added to backpack! 🎒");
      resetForm();
    },
  });

  const resetForm = () => {
    setWord("");
    setTranslation(null);
    setSelectedRating(null);
  };

  const handleTranslate = async () => {
    if (!word.trim()) return;
    
    setIsTranslating(true);
    try {
      // Detect if Hebrew or English and translate accordingly
      const isHebrew = /[\u0590-\u05FF]/.test(word);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: isHebrew 
          ? `Translate this Hebrew word to English and provide transliteration: "${word}"`
          : `Translate this English word to Hebrew with vowels (nikkud), and provide transliteration: "${word}"`,
        response_json_schema: {
          type: "object",
          properties: {
            hebrew: { type: "string", description: "Hebrew word with vowels/nikkud" },
            english: { type: "string", description: "English meaning" },
            transliteration: { type: "string", description: "How to pronounce it" }
          }
        }
      });
      
      setTranslation(result);
    } catch (e) {
      toast.error("Translation failed");
    }
    setIsTranslating(false);
  };

  const handleSave = () => {
    if (!translation || selectedRating === null) return;
    
    createWordMutation.mutate({
      word: translation.hebrew,
      translation: translation.english,
      phonetic: translation.transliteration,
      category: "wordbank",
      times_practiced: selectedRating,
      mastered: selectedRating >= 5,
    });
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>

      {/* Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Backpack className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-bold">Quick Add Word</h3>
            </div>

            {/* Input */}
            <div className="flex gap-2 mb-3">
              <Input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Hebrew or English..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
              />
              <Button
                onClick={handleTranslate}
                disabled={!word.trim() || isTranslating}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
              </Button>
            </div>

            {/* Translation Result */}
            {translation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl p-3 mb-3"
              >
                <p className="text-cyan-400 text-xl font-bold text-center" dir="rtl">
                  {translation.hebrew}
                </p>
                <p className="text-white/60 text-sm text-center">
                  {translation.transliteration}
                </p>
                <p className="text-green-400 text-center mt-1">
                  = {translation.english}
                </p>
              </motion.div>
            )}

            {/* Rating */}
            {translation && (
              <div className="mb-3">
                <p className="text-white/60 text-xs mb-2 text-center">How well do you know it?</p>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedRating(num)}
                      className={`w-10 h-10 rounded-lg font-bold transition-all ${
                        selectedRating === num
                          ? num === 5
                            ? "bg-green-500 text-white"
                            : "bg-cyan-500 text-white"
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            {translation && selectedRating && (
              <Button
                onClick={handleSave}
                disabled={createWordMutation.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
              >
                {createWordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Backpack className="w-4 h-4 mr-2" />
                )}
                Save to Backpack
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}