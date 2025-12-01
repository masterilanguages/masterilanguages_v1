import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, RotateCcw, Play, Volume2, Image, Loader2, Star, Check, ArrowLeft, Coins, Zap, Wand2, MessageSquare, Brain } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WordCard from "../components/practice/WordCard";
import GameHeader from "../components/game/GameHeader";
import ClickableWord from "../components/learning/ClickableWord";
import TranslatorWidget from "../components/TranslatorWidget";
import { toast } from "sonner";

export default function Practice() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("dont-know");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [mode, setMode] = useState("list");
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [buyCoinsDialog, setBuyCoinsDialog] = useState(false);
  
  // AI Features
  const [aiDialog, setAiDialog] = useState(null); // 'mnemonic' | 'sentence' | 'image'
  const [selectedWord, setSelectedWord] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);

  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      if (coins.length === 0) {
        return await base44.entities.UserCoins.create({ coins: 100000000, unlocked_items: [], equipped_item: null });
      }
      return coins[0];
    },
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['words', selectedCategory],
    queryFn: () => {
      if (selectedCategory === "all") {
        return base44.entities.Word.list("-created_date");
      }
      return base44.entities.Word.filter({ category: selectedCategory }, "-created_date");
    },
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['words'] }),
  });

  // AI Generation functions
  const generateMnemonic = async (word) => {
    setSelectedWord(word);
    setAiDialog('mnemonic');
    setAiLoading(true);
    setGeneratedContent(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a fun, memorable mnemonic to help remember the Hebrew word "${word.word}" (${word.phonetic}) which means "${word.translation}". 
        The mnemonic should use the sound of the Hebrew word to create an English phrase or image. 
        Also suggest a visual image that would help remember this word.
        Keep it short and memorable.`,
        response_json_schema: {
          type: "object",
          properties: {
            mnemonic: { type: "string" },
            visual_description: { type: "string" },
            example_sentence_hebrew: { type: "string" },
            example_sentence_english: { type: "string" }
          }
        }
      });
      setGeneratedContent(result);
    } catch (e) {
      toast.error("Failed to generate mnemonic");
    }
    setAiLoading(false);
  };

  const generateSentence = async (word) => {
    setSelectedWord(word);
    setAiDialog('sentence');
    setAiLoading(true);
    setGeneratedContent(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 3 example sentences using the Hebrew word "${word.word}" (${word.phonetic}) which means "${word.translation}".
        Include both Hebrew and English translations with phonetic pronunciation.`,
        response_json_schema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hebrew: { type: "string" },
                  phonetic: { type: "string" },
                  english: { type: "string" }
                }
              }
            }
          }
        }
      });
      setGeneratedContent(result);
    } catch (e) {
      toast.error("Failed to generate sentences");
    }
    setAiLoading(false);
  };

  const generateImage = async (word) => {
    setSelectedWord(word);
    setAiDialog('image');
    setAiLoading(true);
    setGeneratedContent(null);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A colorful, memorable illustration for learning the Hebrew word "${word.phonetic}" meaning "${word.translation}". The image should be a visual mnemonic that helps remember the word through visual association. Cartoon style, vibrant colors, educational.`
      });
      setGeneratedContent({ url: result.url });
      // Save to word
      await updateWordMutation.mutateAsync({
        id: word.id,
        data: { image_url: result.url }
      });
      toast.success("Image saved to word!");
    } catch (e) {
      toast.error("Failed to generate image");
    }
    setAiLoading(false);
  };

  const saveSentenceAsWord = async (sentence) => {
    await base44.entities.Word.create({
      word: sentence.hebrew,
      translation: sentence.english,
      phonetic: sentence.phonetic,
      category: "sentences",
      difficulty: "beginner",
    });
    toast.success("Sentence saved!");
    queryClient.invalidateQueries({ queryKey: ['words'] });
  };

  const filteredByFolder = words.filter(word => {
    const rating = word.times_practiced || 0;
    if (selectedFolder === "know") return rating >= 5;
    if (selectedFolder === "dont-know") return rating < 5;
    return true;
  });

  useEffect(() => {
    if (filteredByFolder.length > 0) {
      const shuffled = [...filteredByFolder].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
      setCurrentWordIndex(0);
    } else {
      setSessionWords([]);
    }
  }, [words, selectedFolder, selectedCategory]);

  const currentWord = sessionWords[currentWordIndex];

  const handleRate = async (wordId, rating) => {
    await updateWordMutation.mutateAsync({
      id: wordId,
      data: {
        times_practiced: rating,
        mastered: rating >= 5,
      },
    });
    
    // Award coins for learning
    if (rating >= 3 && userCoins) {
      const coinsEarned = rating >= 5 ? 15 : 10;
      updateCoinsMutation.mutate({ coins: (userCoins.coins || 0) + coinsEarned });
      toast.success(`+${coinsEarned} coins!`, { icon: '🪙' });
    }
    
    setSessionStats(prev => ({ 
      correct: rating >= 4 ? prev.correct + 1 : prev.correct, 
      total: prev.total + 1 
    }));
    moveToNext();
  };

  const moveToNext = () => {
    if (currentWordIndex < sessionWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setCurrentWordIndex(0);
      const shuffled = [...sessionWords].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
    }
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, total: 0 });
    setCurrentWordIndex(0);
    const shuffled = [...filteredByFolder].sort(() => Math.random() - 0.5);
    setSessionWords(shuffled);
  };

  const buyCoins = (amount) => {
    updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + amount });
    toast.success(`Added ${amount.toLocaleString()} coins!`);
    setBuyCoinsDialog(false);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => setBuyCoinsDialog(true)} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Learn Words</h1>
            <p className="text-white/60">Earn coins by mastering vocabulary</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dont-know">📚 Learning ({words.filter(w => (w.times_practiced || 0) < 5).length})</SelectItem>
              <SelectItem value="know">✅ Mastered ({words.filter(w => (w.times_practiced || 0) >= 5).length})</SelectItem>
              <SelectItem value="all">All ({words.length})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="basics">Basics</SelectItem>
              <SelectItem value="numbers">Numbers</SelectItem>
              <SelectItem value="colors">Colors</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="animals">Animals</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-xl px-4 py-2">
            <Coins className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold">+10-15 per word</span>
          </div>
        </div>

        {mode === "list" ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => { resetSession(); setMode("flashcards"); }}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl p-6 mb-6 text-white text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">Start Flashcard Mode</h2>
                  <p className="text-white/80">Test yourself and earn more coins</p>
                </div>
                <Play className="w-10 h-10" />
              </div>
            </motion.button>

            {/* Level filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { level: 0, label: "New", color: "bg-gray-500/30 border-gray-500/50" },
                { level: 1, label: "Learning", color: "bg-red-500/30 border-red-500/50" },
                { level: 3, label: "Getting There", color: "bg-yellow-500/30 border-yellow-500/50" },
                { level: 5, label: "Mastered", color: "bg-green-500/30 border-green-500/50" },
              ].map(({ level, label, color }) => {
                const count = level === 0 
                  ? words.filter(w => (w.times_practiced || 0) === 0).length
                  : level === 5
                    ? words.filter(w => (w.times_practiced || 0) >= 5).length
                    : words.filter(w => (w.times_practiced || 0) >= level && (w.times_practiced || 0) < level + 2).length;
                if (count === 0) return null;
                return (
                  <button
                    key={level}
                    onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}
                    className={`px-4 py-2 rounded-xl border ${color} text-white font-medium transition-all ${
                      expandedLevel === level ? 'ring-2 ring-white/50' : ''
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Word grid */}
            <AnimatePresence>
              {expandedLevel !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {words
                      .filter(w => {
                        const rating = w.times_practiced || 0;
                        if (expandedLevel === 0) return rating === 0;
                        if (expandedLevel === 5) return rating >= 5;
                        return rating >= expandedLevel && rating < expandedLevel + 2;
                      })
                      .map((word) => (
                        <motion.div
                          key={word.id}
                          whileHover={{ scale: 1.05 }}
                          className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2"
                        >
                          <ClickableWord
                            word={word.word}
                            transliteration={word.phonetic}
                            translation={word.translation}
                            variant="transliteration"
                            className="text-white font-medium"
                          />
                          <ClickableWord
                            word={word.word}
                            transliteration={word.phonetic}
                            translation={word.translation}
                            variant="hebrew"
                            className="text-cyan-400"
                          />
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); generateMnemonic(word); }}
                              className="w-6 h-6 rounded bg-purple-500/30 hover:bg-purple-500/50 flex items-center justify-center text-purple-300"
                              title="Generate Mnemonic"
                            >
                              <Brain className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); generateSentence(word); }}
                              className="w-6 h-6 rounded bg-blue-500/30 hover:bg-blue-500/50 flex items-center justify-center text-blue-300"
                              title="Generate Sentences"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); generateImage(word); }}
                              className="w-6 h-6 rounded bg-green-500/30 hover:bg-green-500/50 flex items-center justify-center text-green-300"
                              title="Generate Image"
                            >
                              <Image className="w-3 h-3" />
                            </button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            {[1, 2, 3, 4, 5].map(num => (
                              <button
                                key={num}
                                onClick={() => handleRate(word.id, num)}
                                className={`w-5 h-5 rounded-full text-xs font-bold ${
                                  (word.times_practiced || 0) >= num 
                                    ? "bg-cyan-500 text-white" 
                                    : "bg-white/20 text-white/50"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div>
            <Button
              onClick={() => setMode("list")}
              variant="ghost"
              className="text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 rounded-xl px-4 py-2 text-white">
                {currentWordIndex + 1} / {sessionWords.length}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <WordCard
                key={currentWord?.id}
                word={currentWord}
                onRate={handleRate}
                onSkip={moveToNext}
                currentRating={currentWord?.times_practiced || 0}
              />
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={buyCoinsDialog} onOpenChange={setBuyCoinsDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>💎 Buy Coins</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { coins: 1000, price: "$0.99" },
              { coins: 5000, price: "$3.99" },
              { coins: 15000, price: "$9.99" },
            ].map((pkg) => (
              <button
                key={pkg.coins}
                onClick={() => buyCoins(pkg.coins)}
                className="w-full flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:border-yellow-400"
              >
                <span className="font-bold">{pkg.coins.toLocaleString()} Coins</span>
                <span className="text-green-400">{pkg.price}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generated Content Dialog */}
      <Dialog open={!!aiDialog} onOpenChange={() => setAiDialog(null)}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              {aiDialog === 'mnemonic' && 'AI Mnemonic Generator'}
              {aiDialog === 'sentence' && 'AI Sentence Generator'}
              {aiDialog === 'image' && 'AI Image Generator'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedWord && (
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-2xl font-bold text-cyan-400" dir="rtl">{selectedWord.word}</p>
              <p className="text-white/60">{selectedWord.phonetic} - {selectedWord.translation}</p>
            </div>
          )}

          {aiLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
              <p className="text-white/60">Generating with AI...</p>
            </div>
          ) : generatedContent && (
            <div className="space-y-4">
              {aiDialog === 'mnemonic' && (
                <>
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
                    <h4 className="text-purple-300 text-sm font-semibold mb-2">💡 Mnemonic</h4>
                    <p className="text-white">{generatedContent.mnemonic}</p>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <h4 className="text-blue-300 text-sm font-semibold mb-2">🖼️ Visual</h4>
                    <p className="text-white/80">{generatedContent.visual_description}</p>
                  </div>
                  {generatedContent.example_sentence_hebrew && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <h4 className="text-green-300 text-sm font-semibold mb-2">📝 Example</h4>
                      <p className="text-white" dir="rtl">{generatedContent.example_sentence_hebrew}</p>
                      <p className="text-white/60 mt-1">{generatedContent.example_sentence_english}</p>
                    </div>
                  )}
                </>
              )}

              {aiDialog === 'sentence' && generatedContent.sentences && (
                <div className="space-y-3">
                  {generatedContent.sentences.map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-lg text-cyan-400" dir="rtl">{s.hebrew}</p>
                      <p className="text-white/60 text-sm">{s.phonetic}</p>
                      <p className="text-white/80 mt-1">{s.english}</p>
                      <Button
                        size="sm"
                        onClick={() => saveSentenceAsWord(s)}
                        className="mt-2 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        <Check className="w-3 h-3 mr-1" /> Save Sentence
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {aiDialog === 'image' && generatedContent.url && (
                <div className="text-center">
                  <img 
                    src={generatedContent.url} 
                    alt="Generated mnemonic" 
                    className="rounded-xl max-h-64 mx-auto shadow-lg"
                  />
                  <p className="text-green-400 mt-3">✓ Image saved to word!</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Translator Widget */}
      <TranslatorWidget />
    </div>
  );
}