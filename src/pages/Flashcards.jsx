import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Volume2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import EditableWord from "../components/learning/EditableWord";

export default function Flashcards() {
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealState, setRevealState] = useState(0); // 0: image only, 1: +english, 2: +target/conjugation
  const [imageRegenDialog, setImageRegenDialog] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [exampleSentences, setExampleSentences] = useState([]);
  const [generatingSentences, setGeneratingSentences] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      if (coins.length === 0) {
        return await base44.entities.UserCoins.create({ coins: 100000000, unlocked_items: [] });
      }
      return coins[0];
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['words'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['words'] }),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Sentence added to backpack!");
    },
  });

  const levelData = [
    { level: 0, label: "Level 0", subtitle: "New", gradient: "from-gray-500 to-slate-500" },
    { level: 1, label: "Level 1", subtitle: "Seen", gradient: "from-red-500 to-pink-500" },
    { level: 2, label: "Level 2", subtitle: "Familiar", gradient: "from-orange-500 to-amber-500" },
    { level: 3, label: "Level 3", subtitle: "Practicing", gradient: "from-yellow-500 to-lime-500" },
    { level: 4, label: "Level 4", subtitle: "Strong", gradient: "from-blue-500 to-cyan-500" },
    { level: 5, label: "Level 5", subtitle: "Mastered", gradient: "from-green-500 to-emerald-500" },
  ];

  const getWordsForLevel = (level) => {
    return words.filter(w => (w.times_practiced || 0) === level);
  };

  const startSession = (level) => {
    const levelWords = getWordsForLevel(level);
    if (levelWords.length === 0) {
      toast.error("No words at this level yet!");
      return;
    }
    const shuffled = [...levelWords].sort(() => Math.random() - 0.5);
    setSessionWords(shuffled);
    setCurrentIndex(0);
    setRevealState(0);
    setSelectedLevel(level);
    setExampleSentences([]);
  };

  const generateSentences = async (word) => {
    if (exampleSentences.length > 0) return;
    setGeneratingSentences(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 simple example sentences in Hebrew using the word "${word.word}" (${word.translation}).
        
Each sentence should:
- Be short (5-10 words)
- Use common vocabulary
- Show natural usage
- Include the target word

Return JSON with sentences array, each containing:
- hebrew: the Hebrew sentence
- transliteration: phonetic spelling
- english: English translation`,
        response_json_schema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hebrew: { type: "string" },
                  transliteration: { type: "string" },
                  english: { type: "string" }
                }
              }
            }
          }
        }
      });
      setExampleSentences(result.sentences || []);
    } catch (e) {
      console.error("Failed to generate sentences", e);
    }
    setGeneratingSentences(false);
  };

  const addSentenceToBackpack = async (sentence) => {
    await createWordMutation.mutateAsync({
      word: sentence.hebrew,
      translation: sentence.english,
      phonetic: sentence.transliteration,
      category: "sentences",
      times_practiced: 0,
    });
  };

  const handleCardTap = () => {
    if (revealState < 2) {
      setRevealState(revealState + 1);
    } else if (currentWord?.is_verb && revealState === 2) {
      // For verbs, stay at conjugation view
      return;
    }
  };

  const handleRating = async (rating) => {
    const currentWord = sessionWords[currentIndex];
    
    await updateWordMutation.mutateAsync({
      id: currentWord.id,
      data: {
        times_practiced: rating,
        mastered: rating >= 5,
      },
    });

    if (rating >= 3 && userCoins) {
      const coinsEarned = rating >= 5 ? 20 : 10;
      updateCoinsMutation.mutate({ coins: (userCoins.coins || 0) + coinsEarned });
      toast.success(`+${coinsEarned} coins!`, { icon: '🪙' });
    }

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealState(0);
      setExampleSentences([]);
    } else {
      toast.success("Session complete! 🎉");
      setSelectedLevel(null);
    }
  };

  const handleImageRegenerate = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A colorful, memorable illustration for learning: ${imagePrompt}. 
        The word means "${currentWord.translation}". 
        Cartoon style, vibrant colors, educational, fun and memorable.
        NO TEXT in the image - purely visual.`
      });
      await updateWordMutation.mutateAsync({
        id: currentWord.id,
        data: { image_url: result.url }
      });
      toast.success("New image saved!");
      setImageRegenDialog(false);
      setImagePrompt("");
      setRevealState(0);
    } catch (e) {
      toast.error("Failed to generate image");
    }
    setGeneratingImage(false);
  };

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'he-IL';
      window.speechSynthesis.speak(utterance);
    }
  };

  React.useEffect(() => {
    if (currentWord && revealState >= 1) {
      generateSentences(currentWord);
    }
  }, [currentWord, revealState]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const currentWord = sessionWords[currentIndex];

  // Filter screen
  if (selectedLevel === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Flashcards</h1>
            <p className="text-white/60">Pick a level to start learning</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {levelData.map(({ level, label, subtitle, gradient }) => {
              const count = getWordsForLevel(level).length;
              return (
                <motion.button
                  key={level}
                  whileHover={{ scale: count > 0 ? 1.05 : 1 }}
                  whileTap={{ scale: count > 0 ? 0.95 : 1 }}
                  onClick={() => count > 0 && startSession(level)}
                  className={`relative p-6 rounded-3xl border-2 transition-all ${
                    count > 0
                      ? 'border-white/20 bg-white/5 hover:border-cyan-400/50 cursor-pointer'
                      : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
                    <span className="text-3xl font-bold text-white">{level}</span>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-1">{label}</h3>
                  <p className="text-white/60 text-sm mb-2">{subtitle}</p>
                  <div className="bg-white/10 rounded-xl px-3 py-1 inline-block">
                    <span className="text-white font-medium">{count} words</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Full-screen flashcard session
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Main card area */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentWord?.id}-${revealState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleCardTap}
            className="w-full max-w-2xl h-full max-h-[700px] bg-white/10 backdrop-blur-xl rounded-3xl border-2 border-white/20 p-8 cursor-pointer flex flex-col items-center justify-start relative overflow-y-auto"
          >
            {/* Top bar inside card */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <Button
                onClick={() => setSelectedLevel(null)}
                variant="ghost"
                size="icon"
                className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm font-medium">
                  Level {currentWord?.times_practiced || 0}
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <span className="text-white text-sm font-medium">{currentIndex + 1}/{sessionWords.length}</span>
                </div>
                <button
                  onClick={() => setImageRegenDialog(true)}
                  className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center text-xl"
                >
                  🎨
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full mt-12">
            {/* Image (always visible if exists) */}
            {currentWord?.image_url && revealState >= 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md mb-6"
              >
                <img
                  src={currentWord.image_url}
                  alt="Flashcard"
                  className="w-full h-64 object-contain rounded-2xl"
                />
              </motion.div>
            )}



            {/* English (state 1+) */}
            {revealState >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4"
                onClick={(e) => e.stopPropagation()}
              >
                <EditableWord
                  text={currentWord?.translation || ''}
                  onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { translation: newText } })}
                  className="text-white text-5xl font-bold uppercase"
                />
              </motion.div>
            )}

            {/* Target language (state 2) */}
            {revealState >= 2 && !currentWord?.is_verb && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 justify-center mb-2">
                  <EditableWord
                    text={currentWord?.phonetic || ''}
                    onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { phonetic: newText } })}
                    className="text-cyan-400 text-3xl font-medium"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(currentWord);
                    }}
                    className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center"
                  >
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
                <EditableWord
                  text={currentWord?.word || ''}
                  language="he"
                  onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { word: newText } })}
                  className="text-white/80 text-2xl"
                  dir="rtl"
                />
              </motion.div>
            )}

            {/* Verb conjugation table (state 2) */}
            {revealState >= 2 && currentWord?.is_verb && currentWord?.verb_conjugations && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-3xl overflow-x-auto"
              >
                <div className="grid grid-cols-3 gap-4 text-white text-sm">
                  {/* Headers */}
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold text-white/60 mb-3 text-base">PAST</h4>
                  </div>
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold text-cyan-400 mb-3 text-xl">PRESENT</h4>
                  </div>
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold text-white/60 mb-3 text-base">FUTURE</h4>
                  </div>

                  {/* Rows for each person */}
                  {['i', 'you_m', 'you_f', 'he', 'she', 'we', 'they'].map((person) => {
                    const labels = { i: 'I', you_m: 'You (m)', you_f: 'You (f)', he: 'He', she: 'She', we: 'We', they: 'They' };
                    return (
                      <React.Fragment key={person}>
                        {/* Past */}
                        <div className="text-center p-2 bg-white/5 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <p className="text-white/40 text-xs mb-1">{labels[person]}</p>
                          <EditableWord
                            text={currentWord.verb_conjugations.past?.[person]?.transliteration || '-'}
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.past) updated.past = {};
                              if (!updated.past[person]) updated.past[person] = {};
                              updated.past[person].transliteration = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-white/80 font-medium"
                          />
                          <EditableWord
                            text={currentWord.verb_conjugations.past?.[person]?.native || ''}
                            language="he"
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.past) updated.past = {};
                              if (!updated.past[person]) updated.past[person] = {};
                              updated.past[person].native = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-white/60 text-xs"
                            dir="rtl"
                          />
                        </div>
                        
                        {/* Present (highlighted) */}
                        <div className="text-center p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30" onClick={(e) => e.stopPropagation()}>
                          <p className="text-cyan-300 text-xs mb-1">{labels[person]}</p>
                          <EditableWord
                            text={currentWord.verb_conjugations.present?.[person]?.transliteration || '-'}
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.present) updated.present = {};
                              if (!updated.present[person]) updated.present[person] = {};
                              updated.present[person].transliteration = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-white font-bold text-lg"
                          />
                          <EditableWord
                            text={currentWord.verb_conjugations.present?.[person]?.native || ''}
                            language="he"
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.present) updated.present = {};
                              if (!updated.present[person]) updated.present[person] = {};
                              updated.present[person].native = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-cyan-300 text-sm"
                            dir="rtl"
                          />
                        </div>
                        
                        {/* Future */}
                        <div className="text-center p-2 bg-white/5 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <p className="text-white/40 text-xs mb-1">{labels[person]}</p>
                          <EditableWord
                            text={currentWord.verb_conjugations.future?.[person]?.transliteration || '-'}
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.future) updated.future = {};
                              if (!updated.future[person]) updated.future[person] = {};
                              updated.future[person].transliteration = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-white/80 font-medium"
                          />
                          <EditableWord
                            text={currentWord.verb_conjugations.future?.[person]?.native || ''}
                            language="he"
                            onSave={(newText) => {
                              const updated = { ...currentWord.verb_conjugations };
                              if (!updated.future) updated.future = {};
                              if (!updated.future[person]) updated.future[person] = {};
                              updated.future[person].native = newText;
                              updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                            }}
                            className="text-white/60 text-xs"
                            dir="rtl"
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom rating buttons (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent backdrop-blur-sm">
        <p className="text-white/60 text-center text-sm mb-3">
          How well do you know this?
        </p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <motion.button
              key={rating}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRating(rating)}
              className={`w-14 h-14 rounded-xl font-bold text-lg transition-all ${
                rating === 0
                  ? "bg-gray-500/30 text-white/60"
                  : rating === 5
                  ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg"
                  : rating >= 4
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                  : rating >= 3
                  ? "bg-gradient-to-br from-yellow-500 to-amber-500 text-white"
                  : "bg-white/20 text-white"
              }`}
            >
              {rating}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Image regeneration dialog */}
      <Dialog open={imageRegenDialog} onOpenChange={setImageRegenDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Suggest New Image
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-sm mb-2">This word sounds like...</p>
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="e.g. 'a cat running' or 'someone eating'"
                className="bg-white/5 border-white/20 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleImageRegenerate()}
              />
            </div>
            <Button
              onClick={handleImageRegenerate}
              disabled={!imagePrompt.trim() || generatingImage}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Create Image'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}