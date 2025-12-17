import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Gamepad2, Loader2, X, Wand2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Backpack() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("level5");
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
    }, 2000);

    return () => clearTimeout(timer);
  }, [newWordCustomMnemonic, activeNewWord]);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
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

  const level1Words = wordRatings.filter(w => w.times_practiced === 1);
  const level2Words = wordRatings.filter(w => w.times_practiced === 2);
  const level3Words = wordRatings.filter(w => w.times_practiced === 3);
  const level4Words = wordRatings.filter(w => w.times_practiced === 4);
  const level5Words = wordRatings.filter(w => w.times_practiced >= 5);

  const tabs = [
    { id: "level1", label: "Level 1", color: "orange" },
    { id: "level2", label: "Level 2", color: "yellow" },
    { id: "level3", label: "Level 3", color: "purple" },
    { id: "level4", label: "Level 4", color: "blue" },
    { id: "level5", label: "Level 5", color: "green" },
    { id: "pictures", label: "🖼️ Pictures", color: "pink" },
    { id: "new", label: "📝 New", color: "amber" },
  ];

  const getDisplayWords = () => {
    if (activeTab === "level5") return level5Words;
    if (activeTab === "level4") return level4Words;
    if (activeTab === "level3") return level3Words;
    if (activeTab === "level2") return level2Words;
    if (activeTab === "level1") return level1Words;
    if (activeTab === "pictures") return wordRatings.filter(w => w.image_url);
    if (activeTab === "new") return newWords;
    return [];
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
    
    await createWordMutation.mutateAsync({
      word: activeNewWord.hebrew || activeNewWord.word,
      translation: activeNewWord.meaning,
      phonetic: activeNewWord.word,
      category: "wordbank",
      times_practiced: rating,
      mastered: rating >= 5,
      image_url: newWordImage || null,
    });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={0} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">🎒 My Backpack</h1>
        </div>

        {/* Quick Actions - Top */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" className="w-full bg-white border-gray-200 text-black hover:bg-gray-100 h-auto py-2 flex-col">
              <Gamepad2 className="w-4 h-4 mb-1 text-black" />
              <span className="text-xs text-black">Home</span>
            </Button>
          </Link>
          <Link to={createPageUrl("BabyVideos")}>
            <Button variant="outline" className="w-full bg-white border-gray-200 text-black hover:bg-gray-100 h-auto py-2 flex-col">
              <span className="text-sm mb-1">📺</span>
              <span className="text-xs text-black">Videos</span>
            </Button>
          </Link>
          <Link to={createPageUrl("Practice")}>
            <Button variant="outline" className="w-full bg-white border-gray-200 text-black hover:bg-gray-100 h-auto py-2 flex-col">
              <span className="text-sm mb-1">📚</span>
              <span className="text-xs text-black">Practice</span>
            </Button>
          </Link>
          <Link to={createPageUrl("Library")}>
            <Button variant="outline" className="w-full bg-white border-gray-200 text-black hover:bg-gray-100 h-auto py-2 flex-col">
              <span className="text-sm mb-1">📖</span>
              <span className="text-xs text-black">Library</span>
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/50`
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Show All English Toggle */}
        {!["pictures", "new"].includes(activeTab) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAllEnglish(!showAllEnglish)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showAllEnglish 
                  ? "bg-green-500/20 text-green-400 border border-green-500/50" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
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
              <p className="text-white/40 text-lg">
                {activeTab.startsWith("level") && "No words at this level yet!"}
                {activeTab === "pictures" && "No mnemonic pictures yet. Generate some while learning!"}
                {activeTab === "new" && "No new words yet. Click on words in sentences to add them!"}
              </p>
            </div>
          ) : activeTab === "pictures" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {getDisplayWords().map((word) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setExpandedId(expandedId === word.id ? null : word.id)}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all h-48 flex flex-col"
                >
                  <div className="flex-1 overflow-hidden">
                    <img src={word.image_url} alt={word.phonetic} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 text-center h-16 flex flex-col justify-center">
                    <p className="text-cyan-400 font-medium truncate">{word.phonetic || word.word}</p>
                    {expandedId === word.id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-green-400 font-medium text-sm truncate"
                      >
                        = {word.translation}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : activeTab === "new" ? (
            newWords.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 text-lg">No new words yet. Click on words in sentences to add them!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newWords.map((w, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveNewWord(w)}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 cursor-pointer hover:border-amber-400 transition-all"
                  >
                    <p className="text-cyan-400 font-bold">{w.word}</p>
                    <p className="text-white/60 text-sm">{w.meaning}</p>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getDisplayWords().map((word) => {
                const isFlipped = flippedCards[word.id] || showAllEnglish;
                return (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                  >
                    <div className="relative">
                      <div
                        onClick={() => setFlippedCards(prev => ({ ...prev, [word.id]: !prev[word.id] }))}
                        className="p-3 cursor-pointer hover:bg-white/5 transition-all h-28 flex flex-col justify-center items-center text-center"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setPictureWordId(pictureWordId === word.id ? null : word.id); }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center text-xs transition-all z-10"
                          title="Create picture"
                        >
                          🎨
                        </button>
                        <p className="text-cyan-400 font-bold text-lg mb-0.5" dir="rtl">{word.word}</p>
                        <p className="text-white/60 text-xs mb-1">{word.phonetic}</p>
                        {isFlipped && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-green-400 font-medium text-sm"
                          >
                            = {word.translation}
                          </motion.p>
                        )}
                      </div>
                      
                      {/* Inline picture generation */}
                      {pictureWordId === word.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="px-3 pb-3"
                        >
                          {word.image_url && (
                            <img src={word.image_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                          )}
                          <Textarea
                            value={mnemonicDescription}
                            onChange={(e) => setMnemonicDescription(e.target.value)}
                            placeholder="Describe a picture..."
                            className="bg-white/5 border-white/20 text-white text-xs mb-2 resize-none h-12"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            onClick={(e) => { e.stopPropagation(); generateMnemonicForWord(word); }}
                            disabled={!mnemonicDescription.trim() || generatingMnemonic}
                            size="sm"
                            className="w-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 h-7 text-xs"
                          >
                            {generatingMnemonic ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                              <><Wand2 className="w-3 h-3 mr-1" /> Generate</>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                    {/* Rating buttons always visible */}
                    <div className="flex gap-0.5 px-2 pb-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={(e) => handleRateWord(word.id, num, e)}
                          className={`flex-1 h-6 rounded text-xs font-bold transition-all ${
                            word.times_practiced === num
                              ? num === 5 ? "bg-green-500 text-white" : "bg-cyan-500 text-white"
                              : "bg-white/10 text-white/40 hover:bg-white/20"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>


      </div>

      {/* Word Sentences Dialog */}
      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-sm max-h-[80vh] overflow-y-auto">
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
              <p className="text-white/60 text-sm">Tap words to add to New Words:</p>
              {sentences.map((sentence, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3">
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
                  <p className="text-white/50 text-sm mt-1">{sentence.english}</p>
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
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              <span className="text-white/70 text-lg block" dir="rtl">{activeNewWord?.hebrew}</span>
              <span className="text-cyan-400 text-2xl">{activeNewWord?.word}</span>
              <span className="text-white/60 text-lg block">= {activeNewWord?.meaning}</span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Mnemonic section - First */}
          <p className="text-white/60 text-sm mb-2">Describe your own picture to remember this word:</p>

          {/* Custom input */}
          <div className="mb-3">
            <Textarea
              value={newWordCustomMnemonic}
              onChange={(e) => setNewWordCustomMnemonic(e.target.value)}
              placeholder="e.g. A dog eating an apple..."
              className="bg-white/5 border-white/20 text-white text-sm resize-none h-16 w-full"
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
          <p className="text-white/60 text-sm mb-2 text-center">How well do you know this word?</p>
          <div className="flex gap-2 justify-center mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNewWordRate(num)}
                className={`w-12 h-12 rounded-xl font-bold ${
                  num === 5 ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
                }`}
              >
                {num}{num === 5 && "⭐"}
              </motion.button>
            ))}
          </div>

          {/* Next Word button */}
          <Button onClick={finishNewWord} className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
            Next Word →
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}