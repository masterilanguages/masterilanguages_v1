import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Loader2, X, Wand2, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import EditableWord from "../components/learning/EditableWord";
import CoreVocabTab from "../components/grammar/CoreVocabTab";
import DeletablePictureBox from "../components/learning/DeletablePictureBox";
import TranslatorWidget from "../components/TranslatorWidget";

export default function Backpack() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("level0");
  const [addWordForm, setAddWordForm] = useState({ phonetic: '', translation: '' });
  const [addingWord, setAddingWord] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [sentences, setSentences] = useState(null);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [newWords, setNewWords] = useState([]);
  const [activeNewWord, setActiveNewWord] = useState(null);
  const [showAllEnglish, setShowAllEnglish] = useState(false);
  const [activeSecondTab, setActiveSecondTab] = useState(null); // 'verbs' | 'corevocab' | null
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
  const [showPhonetics, setShowPhonetics] = useState(false); // global toggle for all cards

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
    queryKey: ['wordRatings', userProfile?.language, currentUser?.email],
    queryFn: async () => {
      const lang = userProfile?.language || 'hebrew';
      // Fetch only THIS user's own rated words
      const ownWords = await base44.entities.Word.filter({ category: "wordbank", language: lang, created_by: currentUser.email });
      // Fetch all approved words (shared by admin across all users)
      const approvedWords = await base44.entities.Word.filter({ approved: true, language: lang });
      // Find approved words the user hasn't personally rated yet (by phonetic)
      const ownPhonetics = new Set(ownWords.map(w => (w.phonetic || w.word).toLowerCase()));
      const unratedApproved = approvedWords.filter(w => !ownPhonetics.has((w.phonetic || w.word).toLowerCase()));
      // Show these as shared cards with times_practiced = 0 so user can rank them
      const sharedCards = unratedApproved.map(w => ({ ...w, _shared: true, times_practiced: 0, mastered: false }));
      return [...ownWords, ...sharedCards];
    },
    enabled: !!userProfile && !!currentUser?.email,
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

  const approveWordMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.Word.update(id, {
      approved,
      approved_by: approved ? currentUser?.email : null,
      approved_at: approved ? new Date().toISOString() : null,
    }),
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success(approved ? "Card approved ✅ — now shared with all users" : "Approval removed");
    },
  });

  const handleRateWord = async (wordId, rating, event) => {
    event.stopPropagation();
    // Check if it's a shared (approved) card not yet owned by this user
    const word = wordRatings.find(w => w.id === wordId);
    if (word?._shared) {
      // Save a copy for this user
      await createWordMutation.mutateAsync({
        word: word.word,
        translation: word.translation,
        phonetic: word.phonetic,
        category: 'wordbank',
        language: word.language || userProfile?.language || 'hebrew',
        times_practiced: rating,
        mastered: rating >= 5,
        image_url: word.image_url || null,
      });
      return;
    }
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
        ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO WRITING, NO LABELS of any kind in the image - purely visual illustration only.`
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

  const [mnemonicExplanations, setMnemonicExplanations] = useState({});

  const suggestMnemonicForWord = async (word) => {
    setSuggestingMnemonic(word.id);
    try {
      const rawWord = word.phonetic || word.word;
      // Strip Hebrew infinitive "l" prefix (e.g. "lehorot" → "horot") for sound matching
      const targetWord = /^l[aeiou]/i.test(rawWord) ? rawWord.slice(1) : rawWord;
      const meaning = word.translation || '';

      const concept = await base44.integrations.Core.InvokeLLM({
        prompt: `You help create mnemonics for language learning.

Target word: "${targetWord}" (meaning: "${meaning}")

Step 1: Find an English NOUN that sounds similar to "${targetWord}". Prioritize sound similarity above all.
Step 2: Imagine that noun PERFORMING the action/meaning "${meaning}" in a funny or exaggerated way.
Step 3: Write a 1-sentence visual description for image generation.

Return JSON with:
- sound_anchor: the English noun that sounds like the target word
- explanation: one short sentence (e.g. "A turtle practicing Hebrew flashcards")
- image_prompt: detailed description for generating the image (no text, simple scene, one subject, transparent bg, bright colors)`,
        response_json_schema: {
          type: 'object',
          properties: {
            sound_anchor: { type: 'string' },
            explanation: { type: 'string' },
            image_prompt: { type: 'string' },
          }
        }
      });

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: `${concept.image_prompt}. 3D Pixar-style render, high definition, glossy and vibrant, expressive cartoon character with big eyes, cinematic lighting, ultra-detailed textures, colorful and fun. Plain white background. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
      });

      setMnemonicExplanations(prev => ({ ...prev, [word.id]: concept.explanation }));

      // For approved or shared cards, create a personal copy instead of modifying the original
      if (word.approved || word._shared) {
        // Check if user already has a personal copy
        const existingCopy = wordRatings.find(w =>
          !w.approved && !w._shared &&
          (w.phonetic || w.word).toLowerCase() === (word.phonetic || word.word).toLowerCase()
        );
        if (existingCopy) {
          await updateWordMutation.mutateAsync({ id: existingCopy.id, data: { image_url: imageResult.url } });
        } else {
          await createWordMutation.mutateAsync({
            word: word.word,
            translation: word.translation,
            phonetic: word.phonetic,
            category: 'wordbank',
            language: word.language || userProfile?.language || 'hebrew',
            times_practiced: word.times_practiced || 0,
            mastered: word.mastered || false,
            image_url: imageResult.url,
            mnemonic_explanation: concept.explanation,
          });
        }
      } else {
        await updateWordMutation.mutateAsync({
          id: word.id,
          data: { image_url: imageResult.url, mnemonic_explanation: concept.explanation }
        });
      }

      toast.success('Mnemonic image created! 🎨');
      setPictureWordId(null);
    } catch (e) {
      toast.error('Failed to generate mnemonic');
    }
    setSuggestingMnemonic(null);
  };

  const userLang = userProfile?.language || 'hebrew';
  const langFilteredRatings = wordRatings.filter(w => !w.language || w.language === userLang);
  const level0Words = langFilteredRatings.filter(w => (w.times_practiced || 0) === 0);
  const level1Words = langFilteredRatings.filter(w => w.times_practiced === 1);
  const level2Words = langFilteredRatings.filter(w => w.times_practiced === 2);
  const level3Words = langFilteredRatings.filter(w => w.times_practiced === 3 || w.times_practiced === 4);
  const level5Words = langFilteredRatings.filter(w => w.times_practiced >= 5);

  const coachWords = langFilteredRatings.filter(w => w.coach_folder === 'From Coach' && (w.times_practiced || 0) === 0);

  const tabs = [
    { id: "level0", label: "✨ New", color: "gray" },
    { id: "coach", label: `👨‍🏫 From Coach${coachWords.length > 0 ? ` (${coachWords.length})` : ''}`, color: "yellow" },
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
    else if (activeTab === "coach") words = coachWords;
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
        Create a colorful, cartoon-style illustration that visually represents the meaning. Fun and educational. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO WRITING of any kind in the image.`;
        
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
        Cartoon style, vibrant colors, educational, fun and memorable. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO WRITING of any kind in the image.`
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
        Visually represent the meaning. Fun, educational style. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO WRITING of any kind in the image.`;
        
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
  // Content editable = not approved AND (not locally locked OR is admin)
  const isContentEditable = (word) => !word.approved && (!isWordLocked(word.id) || isAdmin);

  const handleAddNewWord = async () => {
    if (!addWordForm.phonetic.trim() && !addWordForm.translation.trim()) return;
    setAddingWord(true);
    const newWord = await createWordMutation.mutateAsync({
      word: addWordForm.phonetic,
      translation: addWordForm.translation,
      phonetic: addWordForm.phonetic,
      category: 'wordbank',
      language: userProfile?.language || 'hebrew',
      times_practiced: 0,
      mastered: false,
    });
    setAddWordForm({ phonetic: '', translation: '' });
    setAddingWord(false);
    toast.success('Word added! Generating mnemonic... 🎨');
    // Auto-generate mnemonic image
    if (newWord?.id) {
      try {
        const rawWord = addWordForm.phonetic;
        const soundWord = /^l[aeiou]/i.test(rawWord) ? rawWord.slice(1) : rawWord;
        const concept = await base44.integrations.Core.InvokeLLM({
          prompt: `Create a mnemonic for the word "${soundWord}" meaning "${addWordForm.translation}". Find an English word/phrase that SOUNDS like "${soundWord}" and connect it visually to the meaning. Return JSON with: sound_anchor, explanation (one punchy sentence), image_prompt (vivid cartoon scene, no text).`,
          response_json_schema: { type: 'object', properties: { sound_anchor: { type: 'string' }, explanation: { type: 'string' }, image_prompt: { type: 'string' } } }
        });
        const img = await base44.integrations.Core.GenerateImage({
          prompt: `${concept.image_prompt}. 3D Pixar-style render, high definition, glossy and vibrant, expressive cartoon character with big eyes, cinematic lighting, ultra-detailed textures, colorful and fun. Plain white background. ABSOLUTELY NO TEXT anywhere.`
        });
        await updateWordMutation.mutateAsync({ id: newWord.id, data: { image_url: img.url, mnemonic_explanation: concept.explanation } });
        toast.success('Mnemonic created! 🎨');
      } catch (e) {
        console.error('Mnemonic generation failed', e);
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 50%, #eae6da 100%)' }}>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to={createPageUrl("Home")} className="text-stone-400 hover:text-stone-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: '#3a4a3a', fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}>🎒 My Backpack</h1>
        </div>

        {/* Add new word */}
        <div className="mb-5 bg-white/60 rounded-xl border border-stone-200 p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#3d4a2e', fontFamily: 'Jost, sans-serif' }}>+ Add New Word</h3>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={addWordForm.phonetic}
              onChange={(e) => setAddWordForm(prev => ({ ...prev, phonetic: e.target.value }))}
              placeholder="Transliteration (e.g. shalom)"
              className="flex-1 min-w-[140px] bg-white/80 border-stone-300 text-stone-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewWord()}
            />
            <Input
              value={addWordForm.translation}
              onChange={(e) => setAddWordForm(prev => ({ ...prev, translation: e.target.value }))}
              placeholder="English meaning"
              className="flex-1 min-w-[140px] bg-white/80 border-stone-300 text-stone-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewWord()}
            />
            <Button
              onClick={handleAddNewWord}
              disabled={addingWord || (!addWordForm.phonetic.trim() && !addWordForm.translation.trim())}
              style={{ background: '#5a6b5a', color: 'white' }}
            >
              {addingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
        </div>

        {/* Tabs - Single Row + Phonetics Toggle */}
        <div className="flex gap-1 mb-2 justify-center overflow-x-auto flex-wrap items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? tab.id === 'coach' ? 'bg-amber-500 text-white border border-amber-400' : 'bg-stone-700 text-stone-100 border border-stone-600'
                  : 'bg-white/60 text-stone-500 hover:bg-white/80 border border-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Second Row: Verbs + Core Vocab */}
        <div className="flex gap-1 mb-4 justify-center">
          <button
            onClick={() => setActiveSecondTab(activeSecondTab === 'verbs' ? null : 'verbs')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeSecondTab === 'verbs'
                ? "bg-stone-700 text-stone-100 border border-stone-600"
                : "bg-white/60 text-stone-500 hover:bg-white/80 border border-stone-200"
            }`}
          >
            📖 Verbs
          </button>
          <button
            onClick={() => setActiveSecondTab(activeSecondTab === 'corevocab' ? null : 'corevocab')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeSecondTab === 'corevocab'
                ? "bg-stone-700 text-stone-100 border border-stone-600"
                : "bg-white/60 text-stone-500 hover:bg-white/80 border border-stone-200"
            }`}
          >
            📚 Core Vocab
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

        {/* Second Tab Content */}
        {activeSecondTab === 'verbs' && (
          <div className="flex flex-wrap gap-3 justify-center">
            {langFilteredRatings.filter(w => w.is_verb).length === 0 ? (
              <p className="text-stone-400 text-center py-8 w-full">No verbs in your backpack yet.</p>
            ) : (
              langFilteredRatings.filter(w => w.is_verb).map((word) => (
                <div key={word.id} className="bg-white/70 border border-stone-200 rounded-lg p-3 w-44 text-center">
                  <p className="text-cyan-600 font-bold text-base" dir="rtl">{word.word}</p>
                  <p className="text-cyan-500 text-sm font-medium">{word.phonetic}</p>
                  <p className="text-stone-500 text-xs mt-0.5">{word.translation}</p>
                  {word.verb_conjugations && (
                    <span className="text-[10px] text-purple-500 font-semibold mt-1 block">conjugations ✓</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeSecondTab === 'corevocab' && (
          <CoreVocabTab />
        )}

        {/* Content */}
        {!activeSecondTab && <div>
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
                  {/* Approved badge */}
                  {word.approved && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 border-b border-green-200">
                      <span className="text-green-600 text-[10px] font-semibold">✅ Approved card</span>
                    </div>
                  )}
                  {word._shared && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border-b border-blue-200">
                      <span className="text-blue-600 text-[10px] font-semibold">⭐ New — tap to rank</span>
                    </div>
                  )}
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
                     {showPhonetics ? (
                       <span>{word.phonetic || word.word}</span>
                     ) : (
                       <EditableWord
                         text={word.phonetic}
                         editable={isContentEditable(word)}
                         onSave={(newPhonetic) => updateWordMutation.mutate({ id: word.id, data: { phonetic: newPhonetic } })}
                         className="text-cyan-400 font-semibold text-sm"
                       />
                     )}
                    </p>
                    <p className="text-stone-500 text-xs text-center mt-1">
                      = <EditableWord
                        text={word.translation}
                        editable={isContentEditable(word)}
                        onSave={(newTranslation) => updateWordMutation.mutate({ id: word.id, data: { translation: newTranslation } })}
                        className="text-stone-600 text-xs"
                      />
                    </p>
                    <p className="text-cyan-600 font-bold text-sm text-center mt-1" dir="rtl">
                      <EditableWord
                       text={word.word}
                       language="he"
                       editable={isContentEditable(word)}
                        onSave={(newWord) => updateWordMutation.mutate({ id: word.id, data: { word: newWord } })}
                        className="text-cyan-600 font-bold text-sm"
                      />
                    </p>
                  </div>

                  {/* Mnemonic explanation under image */}
                  {(mnemonicExplanations[word.id] || word.mnemonic_explanation) && (
                    <p className="text-[10px] text-center px-2 pb-1 italic" style={{ color: '#6b7c5a' }}>
                      💡 <EditableWord
                        text={mnemonicExplanations[word.id] || word.mnemonic_explanation}
                        editable={true}
                        className="text-[10px] italic"
                        onSave={(val) => {
                          setMnemonicExplanations(prev => ({ ...prev, [word.id]: val }));
                          updateWordMutation.mutate({ id: word.id, data: { mnemonic_explanation: val } });
                        }}
                      />
                    </p>
                  )}

                            {/* Bottom row: ratings + edit/delete buttons */}
                  <div className="px-2 pb-2 flex gap-1 items-center">
                    <div className="flex gap-0.5 flex-1">
                      {[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 5, label: "M" }].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={(e) => handleRateWord(word.id, value, e)}
                          className={`flex-1 h-6 rounded text-xs font-bold transition-all ${
                            word.times_practiced === value || (value === 3 && word.times_practiced === 4)
                              ? value === 5 ? 'bg-green-600 text-white' : 'bg-stone-600 text-white'
                              : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                          }`}
                        >
                          {label}
                          </button>
                          ))}
                          </div>
                    <button
                        onClick={() => suggestMnemonicForWord(word)}
                        disabled={suggestingMnemonic === word.id}
                        className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-purple-500/20 transition-all"
                        title={word.approved || word._shared ? "Generate personal mnemonic (your view only)" : "Generate mnemonic image"}
                      >
                        {suggestingMnemonic === word.id ? <Loader2 className="w-3 h-3 animate-spin text-purple-500" /> : '🎨'}
                      </button>
                    {isAdmin && (
                      <button
                        onClick={() => approveWordMutation.mutate({ id: word.id, approved: !word.approved })}
                        disabled={approveWordMutation.isPending}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all ${
                          word.approved
                            ? 'bg-green-500/30 hover:bg-red-500/20 text-green-700'
                            : 'bg-stone-100 hover:bg-green-500/20 text-stone-400'
                        }`}
                        title={word.approved ? "Unapprove card" : "Approve card for all users"}
                      >
                        ✅
                      </button>
                    )}

                    {(!word.approved || isAdmin) && (
                      <button
                        onClick={() => deleteWordMutation.mutate(word.id)}
                        disabled={word.approved && !isAdmin}
                        className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-red-500/20 transition-all"
                        title="Delete word"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                </motion.div>
              ))}
            </div>
          )}
        </div>}

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
  </div>
  );
}