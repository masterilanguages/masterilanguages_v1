import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Loader2, X, Wand2, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import EditableWord from "../components/learning/EditableWord";
import DeletablePictureBox from "../components/learning/DeletablePictureBox";
import TranslatorWidget from "../components/TranslatorWidget";

export default function Backpack() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("level0");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [sentences, setSentences] = useState(null);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [newWords, setNewWords] = useState([]);
  const [activeNewWord, setActiveNewWord] = useState(null);
  const [showAllEnglish, setShowAllEnglish] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const [pictureWordId, setPictureWordId] = useState(null);
  const [mnemonicDescription, setMnemonicDescription] = useState("");
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  const [newWordImage, setNewWordImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [newWordCustomMnemonic, setNewWordCustomMnemonic] = useState("");
  const [lastImagePrompt, setLastImagePrompt] = useState("");
  const [imageApproved, setImageApproved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [lockedWords, setLockedWords] = useState(JSON.parse(localStorage.getItem('lockedWords') || '{}'));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestingMnemonic, setSuggestingMnemonic] = useState(null); // wordId currently suggesting

  // Load current user
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Migrate: move all "pictures" category words to "wordbank" level0
  useEffect(() => {
    const migrate = async () => {
      const pictureWords = await base44.entities.Word.filter({ category: "pictures" });
      for (const w of pictureWords) {
        await base44.entities.Word.update(w.id, { category: "wordbank", times_practiced: 0, mastered: false });
      }
      if (pictureWords.length > 0) queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
    };
    migrate().catch(() => {});
  }, []);

  // Load pending words from localStorage on mount
  useEffect(() => {
    const pending = JSON.parse(localStorage.getItem('pendingBackpackWords') || '[]');
    if (pending.length > 0) {
      setNewWords(prev => [...prev, ...pending]);
      localStorage.removeItem('pendingBackpackWords');
      toast.success(`${pending.length} word(s) loaded from chat!`);
    }
  }, []);



  // Auto-generate image after user stops typing
  useEffect(() => {
    if (!activeNewWord || !newWordCustomMnemonic.trim() || newWordCustomMnemonic === lastImagePrompt) return;
    
    const timer = setTimeout(() => {
      generateImage(newWordCustomMnemonic);
    }, 500);

    return () => clearTimeout(timer);
  }, [newWordCustomMnemonic, activeNewWord]);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings', userProfile?.language],
    queryFn: () => {
      const lang = userProfile?.language || 'hebrew';
      return base44.entities.Word.filter({ category: "wordbank", language: lang });
    },
    enabled: !!userProfile,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Word rating updated!");
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Word deleted!");
    },
  });

  const handleRateWord = async (wordId, rating, event) => {
    event.stopPropagation();
    await updateWordMutation.mutateAsync({
      id: wordId,
      data: { times_practiced: rating, mastered: rating >= 5 }
    });
  };

  const generateMnemonicForWord = async (word) => {
    if (!mnemonicDescription.trim()) return;
    setGeneratingMnemonic(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A colorful, memorable mnemonic illustration: ${mnemonicDescription}. 
        For learning Hebrew word "${word.phonetic}" meaning "${word.translation}".
        Cartoon style, vibrant colors, educational, fun and memorable.
        NO TEXT OR WORDS in the image - purely visual.`
      });
      await updateWordMutation.mutateAsync({
        id: word.id,
        data: { image_url: result.url }
      });
      toast.success("Picture saved!");
      setPictureWordId(null);
      setMnemonicDescription("");
    } catch (e) {
      toast.error("Failed to generate picture");
    }
    setGeneratingMnemonic(false);
  };

  const suggestMnemonicForWord = async (word) => {
    setSuggestingMnemonic(word.id);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert in memory techniques and language learning mnemonics.

Create the BEST possible mnemonic image description to help remember the Hebrew word:
- Hebrew: "${word.word}"
- Transliteration: "${word.phonetic}"
- Meaning: "${word.translation}"

Use proven memory techniques such as:
- The Keyword Method (find an English word that SOUNDS like the Hebrew word, then link it visually to the meaning)
- Vivid, bizarre, or emotionally engaging imagery
- Action-based scenes (things interacting, not just static objects)
- Familiar locations or characters if helpful

Return ONLY a 1-2 sentence image description (no explanations, no headers). Start directly with the visual scene. Be specific and vivid.`,
      });
      setMnemonicDescription(result.trim());
    } catch (e) {
      toast.error("Failed to get AI suggestion");
    }
    setSuggestingMnemonic(null);
  };

  const level0Words = wordRatings.filter(w => (w.times_practiced || 0) === 0);
  const level1Words = wordRatings.filter(w => w.times_practiced === 1);
  const level2Words = wordRatings.filter(w => w.times_practiced === 2);
  const level3Words = wordRatings.filter(w => w.times_practiced === 3 || w.times_practiced === 4);
  const level5Words = wordRatings.filter(w => w.times_practiced >= 5);

  const tabs = [
    { id: "level0", label: "✨ New", color: "gray" },
    { id: "level1", label: "Level 1", color: "orange" },
    { id: "level2", label: "Level 2", color: "yellow" },
    { id: "level3", label: "Level 3", color: "purple" },
    { id: "level5", label: "✓ Mastered", color: "green" },
  ];


  const getDisplayWords = () => {
    let words = [];
    if (activeTab === "level5") words = level5Words;
    else if (activeTab === "level3") words = level3Words;
    else if (activeTab === "level2") words = level2Words;
    else if (activeTab === "level1") words = level1Words;
    else if (activeTab === "level0") words = level0Words;
    else return [];
    
    // Deduplicate by phonetic (keep highest times_practiced)
    const seen = new Map();
    for (const w of words) {
      const key = (w.phonetic || w.word).toLowerCase();
      if (!seen.has(key) || (w.times_practiced || 0) > (seen.get(key).times_practiced || 0)) {
        seen.set(key, w);
      }
    }
    let result = [...seen.values()].sort((a, b) => (a.phonetic || a.word).localeCompare(b.phonetic || b.word));

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        (w.phonetic || "").toLowerCase().includes(q) ||
        (w.word || "").toLowerCase().includes(q) ||
        (w.translation || "").toLowerCase().includes(q)
      );
    }
    return result;
  };

  const handleWordClick = async (word) => {
    setSelectedWord(word);
    setSentences(null);
    setLoadingSentences(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 3 simple sentences using the word "${word.phonetic || word.word}" which means "${word.translation}".
                      For each sentence provide the transliterated version (not Hebrew letters) and English translation.
                      List each word separately with its Hebrew WITH FULL VOWELS/NIKKUD (nikud marks), transliteration, and meaning.
                      CRITICAL: All Hebrew words MUST include vowel points (nikkud).`,
                      response_json_schema: {
                        type: "object",
                        properties: {
                          sentences: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                transliterated: { type: "string" },
                                english: { type: "string" },
                                words: {
                                  type: "array",
                                  items: {
                                    type: "object",
                                    properties: {
                                      hebrew: { type: "string", description: "Hebrew word WITH FULL vowels/nikkud marks" },
                                      word: { type: "string", description: "Transliteration" },
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
      setSentences(result.sentences);
    } catch (e) {
      console.error(e);
    }
    setLoadingSentences(false);
  };

  const addToNewWords = (word, meaning, hebrew) => {
    const exists = wordRatings.find(w => w.phonetic?.toLowerCase() === word.toLowerCase());
    if (exists) {
      toast.info("Already in backpack!");
      return;
    }
    const alreadyQueued = newWords.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (alreadyQueued) {
      toast.info("Already added!");
      return;
    }
    setNewWords(prev => [...prev, { word, meaning, hebrew }]);
    toast.success(`"${word}" added to New Words! 📝`);
  };

  const handleNewWordRate = async (rating) => {
    if (!activeNewWord) return;
    
    const newWord = await createWordMutation.mutateAsync({
      word: activeNewWord.hebrew || activeNewWord.word,
      translation: activeNewWord.meaning,
      phonetic: activeNewWord.word,
      category: "wordbank",
      language: userProfile?.language || 'hebrew',
      times_practiced: rating,
      mastered: rating >= 5,
      image_url: newWordImage || null,
    });

    // Auto-generate mnemonic if no image yet
    if (!newWordImage && newWord?.id) {
      try {
        setGeneratingMnemonic(true);
        const mnemonicPrompt = `A memorable picture to help learn the Hebrew word "${activeNewWord.word}" meaning "${activeNewWord.meaning}". 
        Create a colorful, cartoon-style illustration that visually represents the meaning. Fun and educational. NO TEXT IN THE IMAGE.`;
        
        const result = await base44.integrations.Core.GenerateImage({
          prompt: mnemonicPrompt
        });

        await updateWordMutation.mutateAsync({
          id: newWord.id,
          data: { image_url: result.url }
        });
        setGeneratingMnemonic(false);
      } catch (e) {
        setGeneratingMnemonic(false);
        console.error("Auto-generation failed", e);
      }
    }

    if (rating >= 5) {
      toast.success("Added to Fluent! ⭐");
    } else {
      toast.success("Word saved!");
    }
    finishNewWord();
  };



  const generateImage = async (prompt) => {
    setGeneratingImage(true);
    setLastImagePrompt(prompt);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A colorful, memorable mnemonic illustration: ${prompt}. 
        For learning the word "${activeNewWord.word}" meaning "${activeNewWord.meaning}".
        Cartoon style, vibrant colors, educational, fun and memorable.`
      });
      setNewWordImage(result.url);
      
      const savedWord = wordRatings.find(w => w.phonetic?.toLowerCase() === activeNewWord.word.toLowerCase());
      if (savedWord) {
        await updateWordMutation.mutateAsync({
          id: savedWord.id,
          data: { image_url: result.url }
        });
      }
      toast.success("Image saved!");
    } catch (e) {
      toast.error("Failed to generate image");
    }
    setGeneratingImage(false);
  };

  const finishNewWord = () => {
    setNewWords(prev => prev.filter(w => w.word !== activeNewWord.word));
    setActiveNewWord(null);
    setNewWordImage(null);
    setImageApproved(false);
    setNewWordCustomMnemonic("");
    setLastImagePrompt("");
  };

  const generateMissingMnemonics = async (words) => {
    for (const word of words) {
      try {
        setGeneratingMnemonic(true);
        const mnemonicPrompt = `A memorable, colorful cartoon illustration to help learn the Hebrew word "${word.phonetic}" meaning "${word.translation}". 
        Visually represent the meaning. Fun, educational style. NO TEXT IN THE IMAGE.`;
        
        const result = await base44.integrations.Core.GenerateImage({
          prompt: mnemonicPrompt
        });

        await updateWordMutation.mutateAsync({
          id: word.id,
          data: { image_url: result.url }
        });
      } catch (e) {
        console.error("Failed to auto-generate mnemonic for", word.phonetic);
      }
    }
    setGeneratingMnemonic(false);
  };

  const toggleWordLock = (wordId) => {
    const updated = { ...lockedWords, [wordId]: !lockedWords[wordId] };
    setLockedWords(updated);
    localStorage.setItem('lockedWords', JSON.stringify(updated));
    toast.success(updated[wordId] ? "Word locked 🔒" : "Word unlocked 🔓");
  };

  const isWordLocked = (wordId) => lockedWords[wordId];
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 50%, #eae6da 100%)' }}>
      <GameHeader profile={userProfile} coins={0} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to={createPageUrl("Home")} className="text-stone-400 hover:text-stone-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: '#3a4a3a', fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}>🎒 My Backpack</h1>
        </div>

        {/* Tabs - Single Row */}
        <div className="flex gap-1 mb-4 justify-center overflow-x-auto flex-wrap items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-stone-700 text-stone-100 border border-stone-600"
                  : "bg-white/60 text-stone-500 hover:bg-white/80 border border-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Search toggle */}
          <button
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
            className={`p-1.5 rounded-lg border transition-all ${searchOpen ? "bg-stone-700 text-stone-100 border-stone-600" : "bg-white/60 text-stone-500 hover:bg-white/80 border-stone-200"}`}
            title="Search words"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        {/* Search input */}
        {searchOpen && (
          <div className="mb-4 max-w-xs mx-auto">
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by word or translation..."
              className="bg-white/80 border-stone-300 text-stone-800"
            />
          </div>
        )}

        {/* Show All English Toggle */}
        {(
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAllEnglish(!showAllEnglish)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showAllEnglish 
                  ? "bg-stone-600 text-stone-100 border border-stone-500" 
                  : "bg-white/60 text-stone-500 hover:bg-white/80 border border-stone-200"
              }`}
            >
              {showAllEnglish ? "✓ Show English" : "Show English"}
            </button>
          </div>
        )}

        {/* Content */}
        <div>
          {getDisplayWords().length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-400 text-lg">No words at this level yet!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              {getDisplayWords().map((word) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/70 border border-stone-200 rounded-lg overflow-hidden w-48 flex flex-col"
                >
                  {/* Large mnemonic image */}
                  <div className="h-40 bg-stone-100 flex items-center justify-center overflow-hidden">
                    {word.image_url ? (
                      <img src={word.image_url} alt={word.phonetic} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-400/20 via-purple-400/20 to-pink-400/20 flex flex-col items-center justify-center text-center px-4">
                        <p className="text-cyan-600 font-bold text-xl mb-2" dir="rtl">{word.word}</p>
                        <p className="text-stone-500 text-sm">{word.phonetic}</p>
                      </div>
                    )}
                  </div>

                  {/* Word info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-cyan-400 font-semibold text-sm text-center">
                      <EditableWord
                        text={word.phonetic}
                        editable={!isWordLocked(word.id) || isAdmin}
                        onSave={(newPhonetic) => updateWordMutation.mutate({ id: word.id, data: { phonetic: newPhonetic } })}
                        className="text-cyan-400 font-semibold text-sm"
                      />
                    </p>
                    <p className="text-stone-500 text-xs text-center mt-1">
                      = <EditableWord
                        text={word.translation}
                        editable={!isWordLocked(word.id) || isAdmin}
                        onSave={(newTranslation) => updateWordMutation.mutate({ id: word.id, data: { translation: newTranslation } })}
                        className="text-stone-600 text-xs"
                      />
                    </p>
                    <p className="text-cyan-600 font-bold text-sm text-center mt-1" dir="rtl">
                      <EditableWord
                        text={word.word}
                        language="he"
                        editable={!isWordLocked(word.id) || isAdmin}
                        onSave={(newWord) => updateWordMutation.mutate({ id: word.id, data: { word: newWord } })}
                        className="text-cyan-600 font-bold text-sm"
                      />
                    </p>
                  </div>

                  {/* Bottom row: ratings + edit/delete buttons */}
                  <div className="px-2 pb-2 flex gap-1 items-center">
                    <div className="flex gap-0.5 flex-1">
                      {[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 5, label: "M" }].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={(e) => handleRateWord(word.id, value, e)}
                          disabled={isWordLocked(word.id) && !isAdmin}
                          className={`flex-1 h-6 rounded text-xs font-bold transition-all ${
                            word.times_practiced === value || (value === 3 && word.times_practiced === 4)
                              ? value === 5 ? "bg-green-600 text-white" : "bg-stone-600 text-white"
                              : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                          } ${isWordLocked(word.id) && !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPictureWordId(pictureWordId === word.id ? null : word.id)}
                      disabled={isWordLocked(word.id) && !isAdmin}
                      className={`w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-purple-500/20 transition-all ${isWordLocked(word.id) && !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                      title="Edit/generate picture"
                    >
                      🎨
                    </button>
                    <button
                      onClick={() => toggleWordLock(word.id)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all ${
                        isWordLocked(word.id)
                          ? "bg-orange-500/30 hover:bg-orange-500/40"
                          : "hover:bg-stone-300"
                      }`}
                      title={isWordLocked(word.id) ? "Unlock card" : "Lock card"}
                    >
                      {isWordLocked(word.id) ? "🔒" : "🔓"}
                    </button>
                    <button
                      onClick={() => deleteWordMutation.mutate(word.id)}
                      disabled={isWordLocked(word.id) && !isAdmin}
                      className={`w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-red-500/20 transition-all ${isWordLocked(word.id) && !isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                      title="Delete word"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Inline picture editing */}
                  {pictureWordId === word.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="px-3 pb-3 border-t border-stone-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* AI Suggest button */}
                      <button
                        onClick={() => suggestMnemonicForWord(word)}
                        disabled={suggestingMnemonic === word.id}
                        className="w-full mt-2 mb-1.5 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium transition-all disabled:opacity-60"
                      >
                        {suggestingMnemonic === word.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</>
                          : <><Wand2 className="w-3 h-3" /> AI Suggest Best Mnemonic</>
                        }
                      </button>
                      <Textarea
                        value={mnemonicDescription}
                        onChange={(e) => setMnemonicDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && mnemonicDescription.trim() && !generatingMnemonic) {
                            e.preventDefault();
                            generateMnemonicForWord(word);
                          }
                        }}
                        placeholder="Describe a picture... (press Enter to generate)"
                        className="bg-white/5 border-stone-200 text-stone-800 text-xs mb-2 resize-none h-16"
                        disabled={generatingMnemonic}
                      />
                      {mnemonicDescription.trim() && !generatingMnemonic && (
                        <button
                          onClick={() => generateMnemonicForWord(word)}
                          className="w-full py-1.5 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-xs font-medium transition-all"
                        >
                          Generate Image ✨
                        </button>
                      )}
                      {generatingMnemonic && (
                        <div className="flex items-center justify-center gap-2 text-purple-500 text-xs mt-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Generating image...
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Word Sentences Dialog */}
      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent className="bg-stone-50 border-stone-200 text-stone-800 max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-cyan-400">{selectedWord?.phonetic || selectedWord?.word}</span>
              <span className="text-white/60">=</span>
              <span className="text-green-400">{selectedWord?.translation}</span>
            </DialogTitle>
          </DialogHeader>
          
          {loadingSentences ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : sentences ? (
            <div className="space-y-4">
              <p className="text-stone-500 text-sm">Tap words to add to New Words:</p>
              {sentences.map((sentence, idx) => (
                <div key={idx} className="bg-white/60 border border-stone-200 rounded-xl p-3">
                  <div className="flex flex-wrap gap-x-1 gap-y-2 mb-2">
                                            {sentence.transliterated.split(' ').map((word, widx) => {
                                              const wordInfo = sentence.words?.find(w => 
                                                w.word.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, '')
                                              );
                                              const isQueued = newWords.find(w => w.word.toLowerCase() === wordInfo?.word?.toLowerCase());
                                              return (
                                                <button
                                                  key={widx}
                                                  onClick={() => {
                                                    const cleanWord = word.replace(/[.,!?]/g, '');
                                                    const meaning = wordInfo?.meaning || "";
                                                    const hebrew = wordInfo?.hebrew || "";
                                                    addToNewWords(cleanWord, meaning, hebrew);
                                                  }}
                                                  className={`inline-flex flex-col items-start px-0.5 rounded ${
                                                    isQueued 
                                                      ? "text-green-400 bg-green-500/20" 
                                                      : "hover:bg-cyan-500/20 cursor-pointer"
                                                  }`}
                                                >
                                                  <span className="text-white/70 text-[13px] h-[15px] leading-[15px]" dir="rtl">{wordInfo?.hebrew || ""}</span>
                                                  <span className={`text-cyan-400 text-[13px] h-[15px] leading-[15px] ${isQueued ? "" : "underline decoration-dotted"}`}>{word}</span>
                                                </button>
                                              );
                                            })}
                                          </div>
                  <p className="text-stone-400 text-sm mt-1">{sentence.english}</p>
                </div>
              ))}
              
              {newWords.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-amber-400 text-sm mb-2">📝 New Words: {newWords.length}</p>
                  <Button 
                    onClick={() => { setSelectedWord(null); setActiveTab("new"); }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                  >
                    Rate New Words
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>



      {/* New Word Rating Dialog */}
      <Dialog open={!!activeNewWord} onOpenChange={() => setActiveNewWord(null)}>
        <DialogContent className="bg-stone-50 border-stone-200 text-stone-800 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              <span className="text-white/70 text-lg block" dir="rtl">{activeNewWord?.hebrew}</span>
              <span className="text-cyan-400 text-2xl">{activeNewWord?.word}</span>
              <span className="text-white/60 text-lg block">= {activeNewWord?.meaning}</span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Mnemonic section - First */}
          <p className="text-stone-500 text-sm mb-2">Describe your own picture to remember this word:</p>

          {/* Custom input */}
          <div className="mb-3">
            <Textarea
              value={newWordCustomMnemonic}
              onChange={(e) => setNewWordCustomMnemonic(e.target.value)}
              placeholder="e.g. A dog eating an apple..."
              className="bg-white/60 border-stone-200 text-stone-800 text-sm resize-none h-16 w-full"
            />
            {generatingImage && (
              <div className="flex items-center justify-center gap-2 mt-2 text-white/60 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating picture...
              </div>
            )}
          </div>

          {/* Generated Image */}
          {newWordImage && (
            <div className="flex justify-center mb-3">
              <div className="relative inline-block">
                <img src={newWordImage} alt="Mnemonic" className="w-48 rounded-xl border border-white/20" />
                <button
                  onClick={() => generateImage(newWordCustomMnemonic)}
                  disabled={generatingImage}
                  className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  {generatingImage ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <span>🔄</span>}
                </button>
                <button
                  onClick={() => {
                    setImageApproved(true);
                    toast.success("Image saved! ✓");
                  }}
                  className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    imageApproved ? "bg-green-500" : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  <Check className={`w-4 h-4 ${imageApproved ? "text-white" : "text-white/60"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Rating - After picture */}
          <p className="text-stone-500 text-sm mb-2 text-center">How well do you know this word?</p>
          <div className="flex gap-2 justify-center mb-4">
            {[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 5, label: "M ⭐" }].map(({ value, label }) => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNewWordRate(value)}
                className={`w-12 h-12 rounded-xl font-bold ${
                  value === 5 ? "bg-green-600 text-white"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                }`}
              >
                {label}
              </motion.button>
            ))}
          </div>

          {/* Next Word button */}
          <Button onClick={finishNewWord} className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
            Next Word →
          </Button>
        </DialogContent>
      </Dialog>

      {/* Translator Widget */}
      <TranslatorWidget />
      </div>
      );
      }