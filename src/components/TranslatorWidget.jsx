import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronDown, ChevronUp, Backpack, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const LEVEL_COLORS = ["#999999", "#dc2626", "#eab308", "#86efac", "#16a34a", "#16a34a"];
const LEVEL_LABELS = ["New", "1", "2", "3", "4", "Mastered ⭐"];

export default function TranslatorWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("translate");
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [learningLanguage, setLearningLanguage] = useState("he");
  const [wordAdded, setWordAdded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    base44.entities.UserProfile.list().then(profiles => {
      const lang = profiles[0]?.language;
      if (lang) {
        const langMap = { hebrew: "he", spanish: "es", french: "fr", portuguese: "pt", italian: "it" };
        setLearningLanguage(langMap[lang] || "he");
      }
    });
  }, []);

  const { data: backpackWords = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    staleTime: 60 * 1000,
    enabled: isOpen && activeTab === "backpack",
  });

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Added to backpack! 🎒");
      setWordAdded(true);
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setTranslation(null);
    setWordAdded(false);
    setDetails(null);
    setShowDetails(false);

    try {
      const text = inputText.trim();
      // Detect direction: if input contains Hebrew chars, translate TO English, else TO target language
      const hasHebrew = /[\u0590-\u05FF]/.test(text);
      const sl = "auto";
      const tl = hasHebrew ? "en" : learningLanguage;

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();

      const translatedText = data[0]?.map(seg => seg[0]).join("") || "";
      const detectedLang = data[2] || sl;

      setTranslation({
        original: text,
        result: translatedText,
        fromLang: detectedLang,
        toLang: tl,
        isToTarget: !hasHebrew,
      });
    } catch (e) {
      toast.error("Translation failed");
    }
    setIsTranslating(false);
  };

  const handleGetDetails = async () => {
    if (!translation) return;
    setIsLoadingDetails(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate and analyze the word/phrase: "${translation.original}"
Return JSON with: hebrew (with nikud), transliteration, english, part_of_speech, example_sentence_hebrew, example_sentence_english, notes (1 sentence), is_verb (boolean), infinitive (if verb).`,
        response_json_schema: {
          type: "object",
          properties: {
            hebrew: { type: "string" },
            transliteration: { type: "string" },
            english: { type: "string" },
            part_of_speech: { type: "string" },
            example_sentence_hebrew: { type: "string" },
            example_sentence_english: { type: "string" },
            notes: { type: "string" },
            is_verb: { type: "boolean" },
            infinitive: { type: "string" },
          }
        }
      });
      setDetails(result);
      setShowDetails(true);
    } catch (e) {
      toast.error("Failed to load details");
    }
    setIsLoadingDetails(false);
  };

  const handleAddToBackpack = () => {
    if (!translation) return;
    const hebrew = details?.hebrew || (translation.toLang === "he" ? translation.result : translation.original);
    const english = details?.english || (translation.toLang === "en" ? translation.result : translation.original);
    const phonetic = details?.transliteration || translation.result;

    createWordMutation.mutate({
      word: hebrew,
      translation: english,
      phonetic,
      category: "wordbank",
      is_verb: details?.is_verb || false,
      example_sentence: details?.example_sentence_hebrew || "",
      times_practiced: 0,
      mastered: false,
      vocab_level: 0,
    });
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-xl bg-white text-slate-900 shadow-lg flex items-center gap-2 font-bold"
        >
          <Languages className="w-4 h-4" />
          Translate
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-50 w-80 bg-slate-950/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("translate")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "translate" ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" /> Translate
                </button>
                <button
                  onClick={() => setActiveTab("backpack")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "backpack" ? "bg-amber-500 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  🎒 Backpack {backpackWords.length > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{backpackWords.length}</span>}
                </button>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {activeTab === "translate" ? (
                <div className="space-y-3 pt-1">
                  {/* Input row */}
                  <div className="flex gap-2">
                    <Input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a word..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                    />
                    <Button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 flex-shrink-0"
                    >
                      {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
                    </Button>
                  </div>

                  {/* Translation result */}
                  {translation && (
                    <div className="bg-white/8 border border-white/15 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white/50 text-[10px] uppercase mb-0.5">{translation.original}</p>
                          <p className="text-cyan-300 text-xl font-bold" dir={translation.toLang === "he" ? "rtl" : "ltr"}>
                            {translation.result}
                          </p>
                          {details?.transliteration && (
                            <p className="text-white/60 text-sm">{details.transliteration}</p>
                          )}
                        </div>
                        <button
                          onClick={handleAddToBackpack}
                          disabled={createWordMutation.isPending || wordAdded}
                          className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all ${
                            wordAdded ? 'bg-green-500/30 text-green-400' : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                          } disabled:opacity-50`}
                          title="Add to backpack"
                        >
                          {wordAdded ? '✓' : '🎒'}
                        </button>
                      </div>

                      {/* Details section */}
                      {showDetails && details && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          {details.part_of_speech && (
                            <span className="text-[10px] text-white/40 uppercase tracking-wide">{details.part_of_speech}</span>
                          )}
                          {details.example_sentence_hebrew && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                              <p className="text-emerald-300 text-sm" dir="rtl">{details.example_sentence_hebrew}</p>
                              <p className="text-white/50 text-xs mt-0.5">"{details.example_sentence_english}"</p>
                            </div>
                          )}
                          {details.notes && (
                            <p className="text-blue-300/80 text-xs">💡 {details.notes}</p>
                          )}
                        </div>
                      )}

                      {/* More details button */}
                      {!showDetails && (
                        <button
                          onClick={handleGetDetails}
                          disabled={isLoadingDetails}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                        >
                          {isLoadingDetails ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                          {isLoadingDetails ? "Loading..." : "More details"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Backpack Tab */
                <div className="pt-1 space-y-2">
                  {backpackWords.length === 0 ? (
                    <div className="text-center py-8 text-white/40 text-sm">
                      No words yet. Translate words and add them here!
                    </div>
                  ) : (
                    <>
                      <p className="text-white/40 text-xs mb-2">{backpackWords.length} words saved</p>
                      {backpackWords.map(word => {
                        const level = Math.min(word.times_practiced || 0, 5);
                        return (
                          <div key={word.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-cyan-300 font-bold text-base" dir="rtl">{word.word}</span>
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                                  style={{ background: LEVEL_COLORS[level] + '30', color: LEVEL_COLORS[level] }}
                                >
                                  {LEVEL_LABELS[level]}
                                </span>
                              </div>
                              <p className="text-white/60 text-xs truncate">{word.phonetic} — {word.translation}</p>
                            </div>
                            <button
                              onClick={() => deleteWordMutation.mutate(word.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/70 hover:text-red-400 text-xs px-1 flex-shrink-0"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}