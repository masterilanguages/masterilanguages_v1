import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCcw, Play, Volume2, Image, Loader2, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import WordCard from "../components/practice/WordCard";
import SoundWave from "../components/practice/SoundWave";
import ParrotMascot from "../components/mascot/ParrotMascot";
import { toast } from "sonner";


export default function Practice() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("dont-know");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [mode, setMode] = useState("list"); // "list" or "flashcards"
  const [mnemonicDialog, setMnemonicDialog] = useState({ open: false, word: null });
  const [mnemonicPrompt, setMnemonicPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedMnemonic, setExpandedMnemonic] = useState(null);
  const [sentencesDialog, setSentencesDialog] = useState({ open: false, word: null, sentences: [], loading: false });
  const [conjugationDialog, setConjugationDialog] = useState({ open: false, word: null, conjugations: null, loading: false });
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedTransliterations, setExpandedTransliterations] = useState({});
  const [picturePrompt, setPicturePrompt] = useState("");
  const [isGeneratingPicture, setIsGeneratingPicture] = useState(false);
  const [mnemonicSuggestions, setMnemonicSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [editingMeaning, setEditingMeaning] = useState("");
  const [isEditingMeaning, setIsEditingMeaning] = useState(false);
  const [conjugationTense, setConjugationTense] = useState("present");
  const [lastPicturePrompt, setLastPicturePrompt] = useState("");
  const [addedWords, setAddedWords] = useState(new Set());
  
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Word deleted");
    },
  });

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
    setSessionStats(prev => ({ 
      correct: rating >= 4 ? prev.correct + 1 : prev.correct, 
      total: prev.total + 1 
    }));
    moveToNext();
  };

  const handleSkip = () => {
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

  const startFlashcards = () => {
    resetSession();
    setMode("flashcards");
  };

  const playAudio = (word) => {
    if (word.audio_url) {
      const audio = new Audio(word.audio_url);
      audio.play();
    }
  };

  const openMnemonicDialog = (word, e) => {
    e.stopPropagation();
    if (word.image_url) {
      setExpandedMnemonic(expandedMnemonic === word.id ? null : word.id);
    } else {
      setMnemonicDialog({ open: true, word });
      setMnemonicPrompt("");
    }
  };

  const loadMnemonicSuggestions = async (word) => {
    setIsLoadingSuggestions(true);
    setMnemonicSuggestions([]);
    try {
      // Remove "le" prefix for verbs and "ha" prefix for nouns to get the core sound
      let phoneticCore = word.phonetic;
      if (phoneticCore.toLowerCase().startsWith("le")) {
        phoneticCore = phoneticCore.substring(2);
      } else if (phoneticCore.toLowerCase().startsWith("ha")) {
        phoneticCore = phoneticCore.substring(2);
      }
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 creative mnemonic picture ideas to help remember the Hebrew word "${word.phonetic}" (core sound: "${phoneticCore}") means "${word.translation}". 
        
IMPORTANT: Each suggestion MUST be based on an English word that SOUNDS SIMILAR to "${phoneticCore}" (ignore the "le" or "ha" prefix). 
For example: if the word is "lichtov" (to write), use "tov" which sounds like "tub" - "Writing in a bathtub".
If the word is "hakelev" (the dog), use "kelev" which sounds like "Clive" - "A dog named Clive".

Focus on the sound-alike English word for "${phoneticCore}" and create a visual scene connecting it to the meaning "${word.translation}". Keep each under 20 words.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      setMnemonicSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Failed to load suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const openWordDialog = async (word, e) => {
    e.stopPropagation();
    setSentencesDialog({ open: true, word, sentences: [], loading: true });
    setPicturePrompt("");
    setExpandedTransliterations({});
    setMnemonicSuggestions([]);
    setIsEditingMeaning(false);
    setEditingMeaning(word.translation);
    if (!word.image_url) {
      loadMnemonicSuggestions(word);
    }
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 common Hebrew sentences using the word "${word.word}" (${word.phonetic} - ${word.translation}). For each sentence provide the Hebrew (with each word separated), transliteration, English translation, and a breakdown of each Hebrew word with its transliteration and meaning.`,
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
                  english: { type: "string" },
                  words: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        hebrew: { type: "string" },
                        transliteration: { type: "string" },
                        meaning: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      setSentencesDialog(prev => ({ ...prev, sentences: result.sentences, loading: false }));
    } catch (error) {
      toast.error("Failed to generate sentences");
      setSentencesDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const generatePictureForWord = async (useLastPrompt = false) => {
    const promptToUse = useLastPrompt ? lastPicturePrompt : picturePrompt;
    if (!promptToUse.trim()) {
      toast.error("Please describe the picture");
      return;
    }
    if (!sentencesDialog.word) {
      toast.error("No word selected");
      return;
    }
    setIsGeneratingPicture(true);
    try {
      const imagePrompt = `Cute, funny, colorful mnemonic illustration: ${promptToUse}. Cartoon style, memorable.`;
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: imagePrompt,
      });
      
      if (result && result.url) {
        await updateWordMutation.mutateAsync({
          id: sentencesDialog.word.id,
          data: { image_url: result.url },
        });
        setSentencesDialog(prev => ({ ...prev, word: { ...prev.word, image_url: result.url } }));
        toast.success("Picture created!");
        if (!useLastPrompt) {
          setLastPicturePrompt(promptToUse);
        }
        setPicturePrompt("");
      } else {
        toast.error("No image URL in response");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to generate");
    } finally {
      setIsGeneratingPicture(false);
    }
  };

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Word added to New Words!");
    },
  });

  const addWordFromSentence = async (hebrewWord, transliteration, meaning) => {
    const existingWord = words.find(w => w.word === hebrewWord);
    if (existingWord) {
      toast.info("This word is already in your library");
      return;
    }
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `For the Hebrew word "${hebrewWord}" (${transliteration} - ${meaning}):
1. If this is a conjugated verb, provide the infinitive form. If not a verb or already infinitive, return the same word.
2. Is this word in the top 500 most common Hebrew words? Answer true or false.

Return the infinitive Hebrew word, its transliteration, and whether it's top 500.`,
        response_json_schema: {
          type: "object",
          properties: {
            hebrew_infinitive: { type: "string" },
            transliteration_infinitive: { type: "string" },
            meaning: { type: "string" },
            is_top_500: { type: "boolean" }
          }
        }
      });
      
      setAddedWords(prev => new Set([...prev, hebrewWord, result.hebrew_infinitive]));
      createWordMutation.mutate({
        word: result.hebrew_infinitive,
        translation: `${result.meaning} (${result.transliteration_infinitive})`,
        phonetic: result.transliteration_infinitive,
        category: "basics",
        difficulty: "beginner",
        times_practiced: 0,
        is_top_500: result.is_top_500,
        is_starred: result.is_top_500,
      });
    } catch (error) {
      setAddedWords(prev => new Set([...prev, hebrewWord]));
      createWordMutation.mutate({
        word: hebrewWord,
        translation: `${meaning} (${transliteration})`,
        phonetic: transliteration,
        category: "basics",
        difficulty: "beginner",
        times_practiced: 0,
      });
    }
  };

  const loadConjugations = async (tense = "present") => {
    const word = conjugationDialog.word || sentencesDialog.word;
    setConjugationDialog({ open: true, word, conjugations: null, loading: true });
    setConjugationTense(tense);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Conjugate the Hebrew verb "${word.word}" (${word.phonetic} - ${word.translation}) in ${tense} tense for all persons (I, you m/f, he, she, we, you pl m/f, they). Also provide the infinitive form. Provide Hebrew, transliteration, and English for each.`,
        response_json_schema: {
          type: "object",
          properties: {
            infinitive: { type: "string" },
            infinitive_transliteration: { type: "string" },
            root: { type: "string" },
            binyan: { type: "string" },
            conjugations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  person: { type: "string" },
                  hebrew: { type: "string" },
                  transliteration: { type: "string" },
                  english: { type: "string" }
                }
              }
            }
          }
        }
      });
      setConjugationDialog(prev => ({ ...prev, conjugations: result, loading: false }));
    } catch (error) {
      toast.error("Failed to load conjugations");
      setConjugationDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const saveMeaning = async () => {
    if (!editingMeaning.trim()) return;
    await updateWordMutation.mutateAsync({
      id: sentencesDialog.word.id,
      data: { translation: editingMeaning }
    });
    setSentencesDialog(prev => ({ ...prev, word: { ...prev.word, translation: editingMeaning } }));
    setIsEditingMeaning(false);
    toast.success("Meaning updated!");
  };

  const generateMnemonic = async () => {
    if (!mnemonicPrompt.trim()) {
      toast.error("Please describe your mnemonic idea");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Cute, funny, colorful mnemonic illustration for learning the word "${mnemonicDialog.word.phonetic}" (${mnemonicDialog.word.translation}): ${mnemonicPrompt}. Cartoon style, memorable, educational.`,
      });
      const url = result.url;
      if (!url) {
        toast.error("No image URL returned");
        setIsGenerating(false);
        return;
      }
      await updateWordMutation.mutateAsync({
        id: mnemonicDialog.word.id,
        data: { image_url: url },
      });
      toast.success("Mnemonic picture created!");
      setMnemonicDialog({ open: false, word: null });
      setExpandedMnemonic(mnemonicDialog.word.id);
    } catch (error) {
      console.error("Generate mnemonic error:", error);
      toast.error("Failed to generate picture: " + (error.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
              <div className="flex items-center justify-center min-h-screen">
                <SoundWave isPlaying={true} />
              </div>
            );
          }

          return (
            <div className="min-h-screen p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        Practice Session
                      </h1>
                      <p className="text-gray-500">Listen, learn, and master pronunciation</p>
                    </div>
                    <Button
                      onClick={resetSession}
                      variant="outline"
                      className="border-2 border-violet-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </motion.div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                                <SelectTrigger className="w-full md:w-64 border-2 border-violet-100 rounded-xl">
                                  <SelectValue placeholder="Select folder" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dont-know">📚 Words I Don't Know ({words.filter(w => (w.times_practiced || 0) < 5).length})</SelectItem>
                                  <SelectItem value="know">✅ Words I Know ({words.filter(w => (w.times_practiced || 0) >= 5).length})</SelectItem>
                                  <SelectItem value="all">All Words ({words.length})</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full md:w-64 border-2 border-violet-100 rounded-xl">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  <SelectItem value="basics">Basics</SelectItem>
                                  <SelectItem value="numbers">Numbers</SelectItem>
                                  <SelectItem value="colors">Colors</SelectItem>
                                  <SelectItem value="food">Food</SelectItem>
                                  <SelectItem value="animals">Animals</SelectItem>
                                  <SelectItem value="travel">Travel</SelectItem>
                                  <SelectItem value="nature">Nature</SelectItem>
                                  <SelectItem value="business">Business</SelectItem>
                                  <SelectItem value="emotions">Emotions</SelectItem>
                                  <SelectItem value="actions">Actions</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="flex gap-4 items-center flex-1">
                                <ParrotMascot 
                                  size="sm" 
                                  message={
                                    sessionStats.total === 0 ? "Let's learn!" :
                                    sessionStats.correct / sessionStats.total >= 0.8 ? "Amazing work! 🎉" :
                                    sessionStats.correct / sessionStats.total >= 0.5 ? "Keep going! 💪" :
                                    "You can do it! 🌟"
                                  }
                                />
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-violet-100 shadow-sm">
                                  <p className="text-sm text-gray-500">Progress</p>
                                  <p className="text-xl font-bold text-violet-600">
                                    {currentWordIndex + 1} / {sessionWords.length}
                                  </p>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-violet-100 shadow-sm">
                                  <p className="text-sm text-gray-500">Score</p>
                                  <p className="text-xl font-bold text-violet-600">
                                    {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
                                  </p>
                                </div>
                              </div>
                            </div>

                            {filteredByFolder.length === 0 ? (
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-20"
                              >
                                <ParrotMascot size="lg" message="Add some words to start learning!" className="mb-4" />
                              </motion.div>
                            ) : mode === "list" ? (
                              <div>
                                <div className="bg-gradient-to-r from-violet-500 to-blue-500 rounded-2xl p-6 mb-6 text-white">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h2 className="text-xl font-bold mb-1">Ready to practice?</h2>
                                      <p className="text-white/80">Test yourself with flashcards</p>
                                    </div>
                                    <Button 
                                      onClick={startFlashcards}
                                      className="bg-white text-violet-600 hover:bg-violet-50 rounded-xl px-6"
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Flashcards
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-3 mb-6">
                                                                        {[
                                                                          { level: 0, label: "📝 New Words", bg: "bg-gray-100", activeBg: "bg-gray-200", text: "text-gray-700" },
                                                                          { level: 1, label: "❓ Unfamiliar", bg: "bg-red-100", activeBg: "bg-red-200", text: "text-red-700" },
                                                                          { level: 2, label: "📚 Familiar", bg: "bg-violet-100", activeBg: "bg-violet-200", text: "text-violet-700" },
                                                                          { level: 3, label: "💪 Comfortable", bg: "bg-blue-100", activeBg: "bg-blue-200", text: "text-blue-700" },
                                                                          { level: 4, label: "🔥 Almost Fluent", bg: "bg-emerald-100", activeBg: "bg-emerald-200", text: "text-emerald-700" },
                                                                          { level: 5, label: "⭐ Fluent", bg: "bg-green-100", activeBg: "bg-green-200", text: "text-green-700" },
                                                                        ].map(({ level, label, bg, activeBg, text }) => {
                                                                          const count = level === 0 
                                                                                                                      ? words.filter(w => (w.times_practiced || 0) === 0).length
                                                                                                                      : level === 5
                                                                                                                        ? words.filter(w => (w.times_practiced || 0) >= 5).length
                                                                                                                        : words.filter(w => (w.times_practiced || 0) === level).length;
                                                                          if (count === 0) return null;
                                                                          return (
                                                                            <button
                                                                              key={level}
                                                                              onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}
                                                                              className={`px-4 py-2 rounded-full font-medium transition-all ${
                                                                                expandedLevel === level ? activeBg : bg
                                                                              } ${text} hover:shadow-md`}
                                                                            >
                                                                              {label} ({count})
                                                                            </button>
                                                                          );
                                                                        })}
                                                                      </div>

                                                                      <AnimatePresence mode="wait">
                                                                        {expandedLevel !== null && (
                                                                          <motion.div
                                                                            key={expandedLevel}
                                                                            initial={{ opacity: 0, y: -10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            exit={{ opacity: 0, y: -10 }}
                                                                            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 p-4 mb-6"
                                                                          >
                                                                            <div className="flex flex-wrap gap-2">
                                                                              {words
                                                                                .filter(w => {
                                                                                                                                  const rating = w.times_practiced || 0;
                                                                                                                                  if (expandedLevel === 0) return rating === 0;
                                                                                                                                  if (expandedLevel === 5) return rating >= 5;
                                                                                                                                  return rating === expandedLevel;
                                                                                                                                })
                                                                                .map((word) => {
                                                                                  const levelStyles = {
                                                                                    0: { bg: "bg-gray-50", border: "border-gray-200" },
                                                                                                                                                                         1: { bg: "bg-red-50", border: "border-red-200" },
                                                                                                                                                                         2: { bg: "bg-violet-50", border: "border-violet-200" },
                                                                                    3: { bg: "bg-blue-50", border: "border-blue-200" },
                                                                                    4: { bg: "bg-emerald-50", border: "border-emerald-200" },
                                                                                    5: { bg: "bg-green-50", border: "border-green-200" },
                                                                                  };
                                                                                  const style = levelStyles[expandedLevel] || levelStyles[0];
                                                                                  return (
                                                                                    <motion.div
                                                                                      key={word.id}
                                                                                      initial={{ opacity: 0, scale: 0.9 }}
                                                                                      animate={{ opacity: 1, scale: 1 }}
                                                                                      className={`${style.bg} ${style.border} border-2 rounded-2xl px-3 py-2 hover:shadow-md transition-all flex items-center gap-2`}
                                                                                    >
                                                                                      <button
                                                                                        onClick={(e) => { e.stopPropagation(); deleteWordMutation.mutate(word.id); }}
                                                                                        className="text-gray-400 hover:text-red-500 text-xs"
                                                                                        title="Delete word"
                                                                                      >
                                                                                        ✕
                                                                                      </button>
                                                                                      <button 
                                                                                        onClick={(e) => openWordDialog(word, e)}
                                                                                        className="flex items-center gap-2 hover:opacity-80"
                                                                                      >
                                                                                        <span className="font-medium text-gray-700">{word.phonetic}</span>
                                                                                        <span className="text-lg font-bold text-violet-600" dir="rtl">{word.word}</span>
                                                                                        <span className="text-gray-400 text-sm">({word.translation})</span>
                                                                                        {word.image_url && <Image className="w-3 h-3 text-violet-400" />}
                                                                                        {word.audio_url && (
                                                                                          <Volume2 
                                                                                            className="w-3 h-3 text-gray-400 hover:text-violet-500" 
                                                                                            onClick={(e) => { e.stopPropagation(); playAudio(word); }}
                                                                                          />
                                                                                        )}
                                                                                      </button>
                                                                                      <button
                                                                                        onClick={(e) => {
                                                                                          e.stopPropagation();
                                                                                          updateWordMutation.mutate({ id: word.id, data: { is_starred: !word.is_starred } });
                                                                                        }}
                                                                                        className="ml-1"
                                                                                        title={word.is_starred ? "Important word" : "Mark as important"}
                                                                                      >
                                                                                        <Star className={`w-4 h-4 ${word.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                                                                                      </button>
                                                                                      <div className="flex gap-1 ml-2 border-l border-gray-200 pl-2">
                                                                                        {[1, 2, 3, 4, 5].map(num => (
                                                                                          <button
                                                                                            key={num}
                                                                                            onClick={() => handleRate(word.id, num)}
                                                                                            className={`w-6 h-6 rounded-full text-xs font-bold transition-all hover:scale-110 ${
                                                                                              (word.times_practiced || 0) >= num 
                                                                                                ? "bg-violet-500 text-white" 
                                                                                                : "bg-white border border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-500"
                                                                                            }`}
                                                                                          >
                                                                                            {num}
                                                                                          </button>
                                                                                        ))}
                                                                                      </div>
                                                                                      {expandedMnemonic === word.id && word.image_url && (
                                                                                        <motion.div
                                                                                          initial={{ opacity: 0, height: 0 }}
                                                                                          animate={{ opacity: 1, height: "auto" }}
                                                                                          exit={{ opacity: 0, height: 0 }}
                                                                                          className="w-full mt-2"
                                                                                        >
                                                                                          <img 
                                                                                            src={word.image_url} 
                                                                                            alt="Mnemonic" 
                                                                                            className="w-full max-w-xs rounded-xl border-2 border-violet-200"
                                                                                          />
                                                                                        </motion.div>
                                                                                      )}
                                                                                    </motion.div>
                                                                                  );
                                                                                })}
                                                                            </div>
                                                                          </motion.div>
                                                                        )}
                                                                      </AnimatePresence>

                                <Dialog open={mnemonicDialog.open} onOpenChange={(open) => setMnemonicDialog({ ...mnemonicDialog, open })}>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Create mnemonic for <span className="text-violet-600">{mnemonicDialog.word?.phonetic}</span>
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-gray-600">
                                        What does "{mnemonicDialog.word?.phonetic}" sound like? Describe a funny picture to help you remember it means "{mnemonicDialog.word?.translation}"
                                      </p>
                                      <Textarea
                                        placeholder="Describe what the picture should look like..."
                                        value={mnemonicPrompt}
                                        onChange={(e) => setMnemonicPrompt(e.target.value)}
                                        className="min-h-24"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setMnemonicPrompt(`A funny picture showing "${mnemonicDialog.word?.phonetic}" sounds like...`)}
                                        className="text-xs text-violet-500 hover:text-violet-700 underline text-left"
                                      >
                                        e.g., "A dog waving a flag (degel sounds like dog + gel)"
                                      </button>
                                      <Button 
                                        onClick={generateMnemonic}
                                        disabled={isGenerating}
                                        className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
                                      >
                                        {isGenerating ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                          </>
                                        ) : (
                                          <>
                                            <Image className="w-4 h-4 mr-2" />
                                            Create Mnemonic Picture
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={sentencesDialog.open} onOpenChange={(open) => setSentencesDialog({ ...sentencesDialog, open })}>
                                  <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                                                                <DialogTitle className="flex items-center gap-2 flex-wrap">
                                                                                  <span className="text-violet-600 text-xl" dir="rtl">{sentencesDialog.word?.word}</span>
                                                                                  <span className="text-gray-500">({sentencesDialog.word?.phonetic})</span>
                                                                                  {isEditingMeaning ? (
                                                                                    <div className="flex items-center gap-1">
                                                                                      <input
                                                                                        type="text"
                                                                                        value={editingMeaning}
                                                                                        onChange={(e) => setEditingMeaning(e.target.value)}
                                                                                        className="border rounded px-2 py-1 text-sm w-32"
                                                                                        autoFocus
                                                                                      />
                                                                                      <button onClick={saveMeaning} className="text-green-600 text-sm">✓</button>
                                                                                      <button onClick={() => setIsEditingMeaning(false)} className="text-gray-400 text-sm">✕</button>
                                                                                    </div>
                                                                                  ) : (
                                                                                    <button 
                                                                                      onClick={() => { setEditingMeaning(sentencesDialog.word?.translation); setIsEditingMeaning(true); }}
                                                                                      className="text-gray-500 hover:text-violet-600 transition-all"
                                                                                      title="Click to edit meaning"
                                                                                    >
                                                                                      - {sentencesDialog.word?.translation} ✏️
                                                                                    </button>
                                                                                  )}
                                                                                </DialogTitle>
                                                                                <p className="text-xs text-gray-400 mt-1">
                                                                                  <button 
                                                                                    onClick={() => {
                                                                                      navigator.clipboard.writeText(sentencesDialog.word?.phonetic);
                                                                                      toast.success("Copied transliteration!");
                                                                                    }}
                                                                                    className="text-violet-500 hover:text-violet-700 underline mr-2"
                                                                                  >
                                                                                    📋 Copy: {sentencesDialog.word?.phonetic}
                                                                                  </button>
                                                                                  <button 
                                                                                    onClick={() => {
                                                                                      createWordMutation.mutate({
                                                                                        word: sentencesDialog.word?.phonetic,
                                                                                        translation: sentencesDialog.word?.translation,
                                                                                        phonetic: sentencesDialog.word?.phonetic,
                                                                                        category: "basics",
                                                                                        difficulty: "beginner",
                                                                                        times_practiced: 0,
                                                                                      });
                                                                                    }}
                                                                                    className="text-green-500 hover:text-green-700 underline"
                                                                                  >
                                                                                    💾 Save transliterated
                                                                                  </button>
                                                                                </p>
                                                                              </DialogHeader>
                                    <div className="space-y-4">
                                      {/* Picture section */}
                                      {sentencesDialog.word?.image_url ? (
                                        <div className="rounded-xl overflow-hidden border-2 border-violet-200 relative">
                                          <img src={sentencesDialog.word.image_url} alt="Mnemonic" className="w-full" />
                                          <button
                                            onClick={() => generatePictureForWord(true)}
                                            disabled={isGeneratingPicture}
                                            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-violet-600 text-xs px-2 py-1 rounded-lg shadow-md transition-all"
                                          >
                                            {isGeneratingPicture ? "🔄 Generating..." : "🔄 New Image"}
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                          <p className="text-sm text-gray-600 mb-2">Create a mnemonic picture:</p>
                                          
                                          {isLoadingSuggestions ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                              <Loader2 className="w-4 h-4 animate-spin" /> Loading suggestions...
                                            </div>
                                          ) : mnemonicSuggestions.length > 0 && (
                                            <div className="mb-3 space-y-2">
                                              <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500">💡 Suggestions (click to use):</p>
                                                <button
                                                  onClick={() => loadMnemonicSuggestions(sentencesDialog.word)}
                                                  className="text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1"
                                                >
                                                  <RotateCcw className="w-3 h-3" /> New ideas
                                                </button>
                                              </div>
                                              {mnemonicSuggestions.map((suggestion, idx) => (
                                                <button
                                                  key={idx}
                                                  onClick={() => setPicturePrompt(suggestion)}
                                                  className="block w-full text-left text-sm bg-white border border-violet-200 rounded-lg px-3 py-2 hover:bg-violet-50 hover:border-violet-300 transition-all"
                                                >
                                                  {suggestion}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                          
                                          <Textarea
                                            placeholder="Or describe your own picture idea..."
                                            value={picturePrompt}
                                            onChange={(e) => setPicturePrompt(e.target.value)}
                                            className="mb-2"
                                          />
                                          <Button
                                            onClick={() => generatePictureForWord(false)}
                                            disabled={isGeneratingPicture || !picturePrompt.trim()}
                                            size="sm"
                                            className="w-full bg-gradient-to-r from-violet-500 to-blue-500"
                                          >
                                            {isGeneratingPicture ? (
                                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                            ) : (
                                              <><Image className="w-4 h-4 mr-2" /> Generate Picture</>
                                            )}
                                          </Button>
                                        </div>
                                      )}

                                      {sentencesDialog.loading ? (
                                        <div className="flex items-center justify-center py-8">
                                          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                                          <span className="ml-2 text-gray-500">Generating sentences...</span>
                                        </div>
                                      ) : (
                                        <>
                                          <Button
                                            variant="outline"
                                            onClick={loadConjugations}
                                            className="w-full mb-2 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600"
                                          >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Conjugate Verb
                                          </Button>
                                          {sentencesDialog.sentences.map((sentence, idx) => (
                                            <div key={idx} className="bg-violet-50 rounded-xl p-4 border border-violet-100 relative">
                                              <button
                                                onClick={() => setSentencesDialog(prev => ({
                                                  ...prev,
                                                  sentences: prev.sentences.filter((_, i) => i !== idx)
                                                }))}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs"
                                              >
                                                ✕
                                              </button>
                                              <div className="text-xl font-medium text-gray-800 mb-2 flex flex-wrap gap-1" dir="rtl">
                                                {sentence.words?.map((w, wIdx) => {
                                                  const isAdded = words.some(word => word.word === w.hebrew) || addedWords.has(w.hebrew);
                                                  return (
                                                    <button
                                                      key={wIdx}
                                                      onClick={() => !isAdded && addWordFromSentence(w.hebrew, w.transliteration, w.meaning)}
                                                      className={`px-1 rounded transition-all relative ${isAdded ? 'text-green-600 cursor-default' : 'hover:bg-violet-200'}`}
                                                      title={isAdded ? "Already added" : `Add "${w.hebrew}" (${w.transliteration} - ${w.meaning}) to New Words`}
                                                    >
                                                      {w.hebrew}
                                                      {isAdded && <span className="absolute -top-2 -right-1 text-green-500 text-xs">✓</span>}
                                                    </button>
                                                  );
                                                }) || sentence.hebrew}
                                              </div>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-gray-700">{sentence.english}</p>
                                                <button
                                                  onClick={() => setExpandedTransliterations(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                  className="text-xs px-2 py-1 bg-violet-200 hover:bg-violet-300 text-violet-700 rounded-full transition-all"
                                                >
                                                  {expandedTransliterations[idx] ? "Hide" : "Transliterate"}
                                                </button>
                                              </div>
                                              {expandedTransliterations[idx] && (
                                                <p className="text-violet-600 text-sm mt-2 italic">{sentence.transliteration}</p>
                                              )}
                                            </div>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  </DialogContent>
                                                                  </Dialog>

                                                                  <Dialog open={conjugationDialog.open} onOpenChange={(open) => setConjugationDialog({ ...conjugationDialog, open })}>
                                                                    <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                                                                      <DialogHeader>
                                                                        <DialogTitle className="flex items-center gap-2">
                                                                          Conjugations: <span className="text-violet-600" dir="rtl">{conjugationDialog.word?.word}</span>
                                                                        </DialogTitle>
                                                                      </DialogHeader>
                                                                      <div className="space-y-3">
                                                                        {conjugationDialog.loading ? (
                                                                          <div className="flex items-center justify-center py-8">
                                                                            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                                                                            <span className="ml-2 text-gray-500">Loading conjugations...</span>
                                                                          </div>
                                                                        ) : conjugationDialog.conjugations && (
                                                                          <>
                                                                            {/* Infinitive at top */}
                                                                            <div className="bg-gradient-to-r from-violet-100 to-blue-100 rounded-xl p-4 text-center border border-violet-200">
                                                                              <p className="text-xs text-gray-500 mb-1">Infinitive</p>
                                                                              <p className="text-2xl font-bold text-violet-700" dir="rtl">{conjugationDialog.conjugations.infinitive}</p>
                                                                              <p className="text-sm text-gray-600">{conjugationDialog.conjugations.infinitive_transliteration}</p>
                                                                            </div>

                                                                            {/* Tense buttons */}
                                                                            <div className="flex gap-2 justify-center">
                                                                              {["past", "present", "future"].map(tense => (
                                                                                <button
                                                                                  key={tense}
                                                                                  onClick={() => loadConjugations(tense)}
                                                                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                                                    conjugationTense === tense 
                                                                                      ? "bg-violet-500 text-white" 
                                                                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                                  }`}
                                                                                >
                                                                                  {tense.charAt(0).toUpperCase() + tense.slice(1)}
                                                                                </button>
                                                                              ))}
                                                                            </div>

                                                                            <div className="flex gap-2 text-sm text-gray-500 mb-2 flex-wrap">
                                                                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Root: {conjugationDialog.conjugations.root}</span>
                                                                              <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded">Binyan: {conjugationDialog.conjugations.binyan}</span>
                                                                            </div>
                                                                            <div className="grid gap-2">
                                                                              {conjugationDialog.conjugations.conjugations.map((conj, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                                                                                  <span className="text-gray-500 text-sm w-20">{conj.person}</span>
                                                                                  <span className="text-xl font-medium text-gray-800" dir="rtl">{conj.hebrew}</span>
                                                                                  <span className="text-violet-600 text-sm">{conj.transliteration}</span>
                                                                                </div>
                                                                              ))}
                                                                            </div>
                                                                          </>
                                                                        )}
                                                                      </div>
                                                                    </DialogContent>
                                                                  </Dialog>
                                                                </div>
                                                            ) : (
                              <div>
                                <Button
                                  onClick={() => setMode("list")}
                                  variant="outline"
                                  className="mb-4 border-2 border-violet-200 hover:border-violet-300 rounded-xl"
                                >
                                  ← Back to Word List
                                </Button>
                                <AnimatePresence mode="wait">
                                  <WordCard
                                    key={currentWord?.id}
                                    word={currentWord}
                                    onRate={handleRate}
                                    onSkip={handleSkip}
                                    currentRating={currentWord?.times_practiced || 0}
                                  />
                                </AnimatePresence>
                              </div>
                            )}
              </div>
            </div>
          );
        }