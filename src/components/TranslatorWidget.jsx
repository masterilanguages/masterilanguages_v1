import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TranslatorWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [learningLanguage, setLearningLanguage] = useState("hebrew");

  // Get user's learning language
  React.useEffect(() => {
    base44.entities.UserProfile.list().then(profiles => {
      if (profiles[0]?.language) {
        setLearningLanguage(profiles[0].language);
      }
    });
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
    if (!inputText.trim() || !learningLanguage) return;
    
    setIsTranslating(true);
    try {
      // Detect if input is English or Hebrew/transliteration
      const isEnglish = /^[a-zA-Z\s\.,!?'-]+$/.test(inputText.trim());
      
      let prompt, schema;
      
      if (isEnglish) {
        // English to target language
        const targetLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
        prompt = `You are an expert English→${targetLangName} translator for a language-learning app.
Output MUST be valid JSON only (no markdown, no extra text).
Translate naturally to modern ${targetLangName}.
Prefer the most common everyday translation.
If the English is ambiguous, choose the most likely meaning and include 1–3 alternatives.

Transliteration scheme (must be consistent):
- א silent unless needed; use apostrophe only when it disambiguates (e.g., ra'ayon)
- ע use apostrophe only when needed to disambiguate
- ח = kh (e.g., khalom)
- כ (as "kh") = kh, כ (as "k") = k (choose by pronunciation)
- ק = k
- צ = tz
- ש = sh
- ת = t
- ר = r
- ו as "v" = v, as vowel "oo" = u, as "o" = o (context)
- י as consonant = y, as vowel = i (context)

Input: "${inputText}"

Provide:
- "target_language" in ${targetLangName} script
- "transliteration" in Latin letters using the scheme above
- "alternatives" as a list of ${targetLangName} strings (may be empty)
- "notes" only if ambiguity is meaningful (otherwise empty string)`;
        
        schema = {
          type: "object",
          properties: {
            target_language: { type: "string" },
            transliteration: { type: "string" },
            alternatives: { type: "array", items: { type: "string" } },
            notes: { type: "string" }
          }
        };
      } else {
        // Target language/transliteration to English
        const targetLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);
        prompt = `You are an expert transliterated-${targetLangName}→English interpreter for a language-learning app.
Input is ${targetLangName} written in Latin letters (transliteration), possibly with inconsistent spelling.
Your job:
1. Normalize transliteration to the app's scheme
2. Reconstruct the most likely ${targetLangName} spelling
3. Translate to natural English

Output MUST be valid JSON only (no markdown, no extra text).
If ambiguous, choose the most likely and include 1–3 alternatives (as ${targetLangName} strings).

Transliteration scheme: kh/ tz/ sh, etc. Normalize common variants:
- ch → kh
- ts → tz
- w → v (often)
- "ee" → i, "oo" → u
- double letters simplified unless needed

Input: "${inputText}"

Provide:
- "english" translation
- "target_language" reconstructed ${targetLangName} text
- "transliteration" normalized transliteration
- "alternatives" as ${targetLangName} strings if ambiguous`;
        
        schema = {
          type: "object",
          properties: {
            english: { type: "string" },
            target_language: { type: "string" },
            transliteration: { type: "string" },
            alternatives: { type: "array", items: { type: "string" } }
          }
        };
      }
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });
      
      // Normalize for backwards compatibility
      result.hebrew = result.target_language;
      
      setTranslation({ ...result, direction: isEnglish ? 'en-he' : 'tr-en' });
    } catch (e) {
      toast.error("Translation failed");
    }
    setIsTranslating(false);
  };

  const handleAddToBackpack = () => {
    if (!translation || !learningLanguage) return;
    
    createWordMutation.mutate({
      word: translation.hebrew,
      translation: translation.english,
      phonetic: translation.transliteration,
      category: "wordbank",
      times_practiced: 0,
      mastered: false,
    });
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg flex items-center justify-center font-medium"
        >
          Translate
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">Translate</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`English or ${learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1)}...`}
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
                      
                      {translation.alternatives?.length > 0 && (
                        <div className="bg-amber-500/10 rounded-lg p-2">
                          <p className="text-amber-400 text-[10px] mb-1">ALTERNATIVES</p>
                          <div className="flex flex-wrap gap-1">
                            {translation.alternatives.map((alt, idx) => (
                              <span key={idx} className="text-white/70 text-xs" dir="rtl">{alt}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {translation.notes && (
                        <div className="bg-blue-500/10 rounded-lg p-2">
                          <p className="text-blue-300 text-xs">{translation.notes}</p>
                        </div>
                      )}
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
                      
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/60 text-[10px] mb-1">PRONUNCIATION</p>
                        <p className="text-white">{translation.transliteration}</p>
                      </div>
                      
                      {translation.alternatives?.length > 0 && (
                        <div className="bg-amber-500/10 rounded-lg p-2">
                          <p className="text-amber-400 text-[10px] mb-1">ALTERNATIVES</p>
                          <div className="flex flex-wrap gap-1">
                            {translation.alternatives.map((alt, idx) => (
                              <span key={idx} className="text-white/70 text-xs" dir="rtl">{alt}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  onClick={handleAddToBackpack}
                  disabled={createWordMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  {createWordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
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