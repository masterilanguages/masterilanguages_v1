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
  const [revealedSentences, setRevealedSentences] = useState(new Set());
  const [skipCount, setSkipCount] = useState(0);

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
    } else {
      // Skip to next word
      handleSkip();
    }
  };

  const handleSkip = () => {
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);
    
    if (newSkipCount >= 5) {
      toast.info("Remember to rate words to track progress!", { duration: 3000 });
      setSkipCount(0);
    }

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealState(0);
      setExampleSentences([]);
      setRevealedSentences(new Set());
    } else {
      toast.success("Session complete! 🎉");
      setSelectedLevel(null);
    }
  };

  const handleRating = async (rating) => {
    const currentWord = sessionWords[currentIndex];
    
    setSkipCount(0); // Reset skip count when rating
    
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
      setRevealedSentences(new Set());
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

  const currentWord = sessionWords[currentIndex];

  React.useEffect(() => {
    if (currentWord && revealState >= 1 && exampleSentences.length === 0) {
      const generate = async () => {
        setGeneratingSentences(true);
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Generate 3 simple example sentences in Hebrew using the word "${currentWord.word}" (${currentWord.translation}).
            
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
      generate();
    }
  }, [currentWord?.id, revealState]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #1F2A44 0%, #162035 100%)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 rounded-full"
          style={{ borderColor: '#F4C430', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Filter screen
  if (selectedLevel === null) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1F2A44 0%, #162035 100%)' }}>
        <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Flashcards</h1>
            <p className="text-white/75">Pick a level to start learning</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {levelData.map(({ level, label, subtitle, gradient }) => {
              const count = getWordsForLevel(level).length;
              const isGold = level > 0;
              return (
                <motion.button
                  key={level}
                  whileHover={{ scale: count > 0 ? 1.05 : 1 }}
                  whileTap={{ scale: count > 0 ? 0.95 : 1 }}
                  onClick={() => count > 0 && startSession(level)}
                  className={`relative p-6 rounded-3xl transition-all ${
                    count > 0
                      ? 'bg-white shadow-lg hover:shadow-xl cursor-pointer'
                      : 'bg-white/50 shadow opacity-50 cursor-not-allowed'
                  }`}
                  style={{ boxShadow: count > 0 ? '0 4px 16px rgba(0, 0, 0, 0.12)' : undefined }}
                >
                  <div 
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto`}
                    style={{ 
                      background: isGold ? '#F4C430' : '#1F2A44',
                    }}
                  >
                    <span className="text-3xl font-bold" style={{ color: isGold ? '#1F2A44' : '#FFFFFF' }}>{level}</span>
                  </div>
                  <h3 className="font-bold text-xl mb-1" style={{ color: '#1F2A44' }}>{label}</h3>
                  <p className="text-sm mb-2" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>{subtitle}</p>
                  <div className="rounded-xl px-3 py-1 inline-block" style={{ backgroundColor: '#E6E9EF' }}>
                    <span className="font-medium" style={{ color: '#1F2A44' }}>{count} words</span>
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
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #1F2A44 0%, #162035 100%)' }}>
      {/* Main card area */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentWord?.id}-${revealState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleCardTap}
            className="w-full max-w-2xl h-full max-h-[700px] bg-white rounded-3xl p-8 cursor-pointer flex flex-col items-center justify-start relative overflow-y-auto"
            style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}
          >
            {/* Top bar inside card */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    if (confirm("Delete this word?")) {
                      updateWordMutation.mutate({
                        id: currentWord.id,
                        data: { category: "deleted" }
                      });
                      handleSkip();
                    }
                  }}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  style={{ backgroundColor: 'rgba(31, 42, 68, 0.1)' }}
                >
                  🗑️
                </Button>
                <Button
                  onClick={() => setSelectedLevel(null)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full font-bold"
                  style={{ backgroundColor: 'rgba(31, 42, 68, 0.1)', color: '#1F2A44' }}
                >
                  ✕
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="rounded-full px-3 py-1.5 text-sm font-medium"
                  style={{ 
                    backgroundColor: (currentWord?.times_practiced || 0) > 0 ? '#F4C430' : '#E6E9EF',
                    color: '#1F2A44'
                  }}
                >
                  Level {currentWord?.times_practiced || 0}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#E6E9EF' }}>
                    <span className="text-sm font-medium" style={{ color: '#1F2A44' }}>{currentIndex + 1}/{sessionWords.length}</span>
                  </div>
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    size="icon"
                    className="rounded-full font-bold"
                    style={{ backgroundColor: 'rgba(31, 42, 68, 0.1)', color: '#1F2A44' }}
                  >
                    →
                  </Button>
                  <button
                    onClick={() => setImageRegenDialog(true)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: 'rgba(31, 42, 68, 0.1)' }}
                  >
                    🎨
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full mt-12">
            {/* English (state 1+) */}
            {revealState >= 1 && (
              <div className="text-center mb-4" onClick={(e) => e.stopPropagation()}>
                <EditableWord
                  text={currentWord?.translation || ''}
                  onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { translation: newText } })}
                  className="text-5xl font-bold uppercase"
                  style={{ color: '#1F2A44' }}
                />
              </div>
            )}

            {/* Transliteration (state 2) */}
            {revealState >= 2 && !currentWord?.is_verb && (
              <div className="text-center mb-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 justify-center" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                  <EditableWord
                    text={currentWord?.phonetic || ''}
                    onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { phonetic: newText } })}
                    className="text-2xl font-medium"
                    style={{ color: 'rgba(31, 42, 68, 0.7)' }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(currentWord);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(31, 42, 68, 0.1)' }}
                  >
                    <Volume2 className="w-5 h-5" style={{ color: '#1F2A44' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Hebrew (state 2) - under transliteration */}
            {revealState >= 2 && !currentWord?.is_verb && (
              <div className="text-center mb-4" onClick={(e) => e.stopPropagation()}>
                <div dir="rtl" lang="he" style={{ unicodeBidi: 'plaintext', textAlign: 'center' }}>
                  <bdi>
                    <EditableWord
                      text={currentWord?.word || ''}
                      language="he"
                      onSave={(newText) => updateWordMutation.mutate({ id: currentWord.id, data: { word: newText } })}
                      className="text-3xl font-medium"
                      style={{ color: '#1F2A44' }}
                    />
                  </bdi>
                </div>
              </div>
            )}

            {/* Image (inside card content) */}
            {currentWord?.image_url && revealState >= 2 && (
              <div className="w-full max-w-md mb-6 mt-4">
                <img
                  src={currentWord.image_url}
                  alt="Flashcard"
                  className="w-full h-64 object-contain rounded-2xl"
                />
              </div>
            )}

            {/* Verb conjugation table (state 2) */}
            {revealState >= 2 && currentWord?.is_verb && currentWord?.verb_conjugations && (
              <div className="w-full max-w-3xl overflow-x-auto mb-4" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* Headers */}
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold mb-3 text-base" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>PAST</h4>
                  </div>
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold mb-3 text-xl" style={{ color: '#F4C430' }}>PRESENT</h4>
                  </div>
                  <div className="text-center" onClick={(e) => e.stopPropagation()}>
                    <h4 className="font-bold mb-3 text-base" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>FUTURE</h4>
                  </div>

                  {/* Rows for each person */}
                  {['i', 'you_m', 'you_f', 'he', 'she', 'we', 'they'].map((person) => {
                    const labels = { i: 'I', you_m: 'You (m)', you_f: 'You (f)', he: 'He', she: 'She', we: 'We', they: 'They' };
                    return (
                      <React.Fragment key={person}>
                        {/* Past */}
                        <div className="text-center p-2 rounded-lg" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'rgba(31, 42, 68, 0.05)' }}>
                          <p className="text-xs mb-1" style={{ color: 'rgba(31, 42, 68, 0.45)' }}>{labels[person]}</p>
                          <div className="mb-1">
                            <EditableWord
                              text={currentWord.verb_conjugations.past?.[person]?.transliteration || '-'}
                              onSave={(newText) => {
                                const updated = { ...currentWord.verb_conjugations };
                                if (!updated.past) updated.past = {};
                                if (!updated.past[person]) updated.past[person] = {};
                                updated.past[person].transliteration = newText;
                                updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                              }}
                              className="font-medium"
                              style={{ color: 'rgba(31, 42, 68, 0.7)' }}
                            />
                          </div>
                          <div dir="rtl" lang="he" style={{ unicodeBidi: 'plaintext' }}>
                            <bdi>
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
                                className="text-xs"
                                style={{ color: '#1F2A44' }}
                              />
                            </bdi>
                          </div>
                        </div>
                        
                        {/* Present (highlighted with gold) */}
                        <div className="text-center p-2 rounded-lg" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#FFE28A', border: '2px solid #F4C430' }}>
                          <p className="text-xs mb-1" style={{ color: '#1F2A44' }}>{labels[person]}</p>
                          <div className="mb-1">
                            <EditableWord
                              text={currentWord.verb_conjugations.present?.[person]?.transliteration || '-'}
                              onSave={(newText) => {
                                const updated = { ...currentWord.verb_conjugations };
                                if (!updated.present) updated.present = {};
                                if (!updated.present[person]) updated.present[person] = {};
                                updated.present[person].transliteration = newText;
                                updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                              }}
                              className="font-bold"
                              style={{ color: '#1F2A44' }}
                            />
                          </div>
                          <div dir="rtl" lang="he" style={{ unicodeBidi: 'plaintext' }}>
                            <bdi>
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
                                className="text-sm font-medium"
                                style={{ color: '#1F2A44' }}
                              />
                            </bdi>
                          </div>
                        </div>
                        
                        {/* Future */}
                        <div className="text-center p-2 rounded-lg" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'rgba(31, 42, 68, 0.05)' }}>
                          <p className="text-xs mb-1" style={{ color: 'rgba(31, 42, 68, 0.45)' }}>{labels[person]}</p>
                          <div className="mb-1">
                            <EditableWord
                              text={currentWord.verb_conjugations.future?.[person]?.transliteration || '-'}
                              onSave={(newText) => {
                                const updated = { ...currentWord.verb_conjugations };
                                if (!updated.future) updated.future = {};
                                if (!updated.future[person]) updated.future[person] = {};
                                updated.future[person].transliteration = newText;
                                updateWordMutation.mutate({ id: currentWord.id, data: { verb_conjugations: updated } });
                              }}
                              className="font-medium"
                              style={{ color: 'rgba(31, 42, 68, 0.7)' }}
                            />
                          </div>
                          <div dir="rtl" lang="he" style={{ unicodeBidi: 'plaintext' }}>
                            <bdi>
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
                                className="text-xs"
                                style={{ color: '#1F2A44' }}
                              />
                            </bdi>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Example sentences (state 1+) */}
            {revealState >= 1 && (
              <div className="w-full mt-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                {generatingSentences ? (
                  <div className="text-center py-4" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: '#1F2A44' }} />
                    <p className="text-sm">Generating sentences...</p>
                  </div>
                ) : (
                  <>
                    {exampleSentences.map((sentence, idx) => {
                      const isRevealed = revealedSentences.has(idx);
                      return (
                        <div 
                          key={idx} 
                          className="rounded-2xl p-4 cursor-pointer"
                          style={{ backgroundColor: 'rgba(31, 42, 68, 0.05)', border: '1px solid #E6E9EF' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevealedSentences(prev => {
                              const next = new Set(prev);
                              if (next.has(idx)) {
                                next.delete(idx);
                              } else {
                                next.add(idx);
                              }
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="text-sm mb-2" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>{sentence.english}</p>
                              {isRevealed && (
                                <>
                                  <p className="text-base mb-2" dir="ltr" style={{ unicodeBidi: 'isolate', color: 'rgba(31, 42, 68, 0.7)' }}>{sentence.transliteration}</p>
                                  <div className="mb-2" dir="rtl" lang="he" style={{ unicodeBidi: 'plaintext', textAlign: 'right' }}>
                                    <bdi>
                                      {sentence.hebrew.split(' ').map((word, wordIdx) => (
                                        <span key={wordIdx} className="inline-flex items-center gap-1 group">
                                          <EditableWord
                                            text={word}
                                            language="he"
                                            onSave={(newWord) => {
                                              const words = sentence.hebrew.split(' ');
                                              words[wordIdx] = newWord;
                                              const newSentences = [...exampleSentences];
                                              newSentences[idx] = { ...sentence, hebrew: words.join(' ') };
                                              setExampleSentences(newSentences);
                                            }}
                                            className="text-base"
                                            style={{ color: '#1F2A44' }}
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              createWordMutation.mutate({
                                                word: word,
                                                translation: "",
                                                phonetic: "",
                                                category: "wordbank",
                                                times_practiced: 0,
                                              });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                            title="Add to backpack"
                                          >
                                            🎒
                                          </button>
                                          {' '}
                                        </span>
                                      ))}
                                    </bdi>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSentenceToBackpack(sentence);
                                }}
                                className="text-2xl hover:scale-110 transition-transform"
                                title="Add sentence to backpack"
                              >
                                🎒
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExampleSentences(prev => prev.filter((_, i) => i !== idx));
                                  toast.success("Sentence removed");
                                }}
                                className="text-xl hover:scale-110 transition-transform opacity-60 hover:opacity-100"
                                title="Delete sentence"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {exampleSentences.length > 0 && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExampleSentences([]);
                          generateSentences(currentWord);
                        }}
                        variant="outline"
                        className="w-full"
                        style={{ backgroundColor: 'rgba(31, 42, 68, 0.05)', borderColor: '#E6E9EF', color: '#1F2A44' }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate New Sentences
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom rating buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {[0, 1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRating(rating)}
                className="w-9 h-9 rounded-lg font-bold text-sm transition-all hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: rating === 0 ? '#E6E9EF' : rating >= 4 ? '#F4C430' : 'rgba(31, 42, 68, 0.1)',
                  color: '#1F2A44',
                  boxShadow: rating >= 4 ? '0 2px 8px rgba(244, 196, 48, 0.3)' : undefined
                }}
              >
                {rating}
              </button>
            ))}
          </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Image regeneration dialog */}
      <Dialog open={imageRegenDialog} onOpenChange={setImageRegenDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#1F2A44' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#F4C430' }} />
              Suggest New Image
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ color: 'rgba(31, 42, 68, 0.7)' }}>This word sounds like...</p>
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="e.g. 'a cat running' or 'someone eating'"
                className="bg-white"
                style={{ borderColor: '#E6E9EF', color: '#1F2A44' }}
                onKeyDown={(e) => e.key === 'Enter' && handleImageRegenerate()}
              />
            </div>
            <Button
              onClick={handleImageRegenerate}
              disabled={!imagePrompt.trim() || generatingImage}
              className="w-full"
              style={{ backgroundColor: '#F4C430', color: '#1F2A44' }}
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