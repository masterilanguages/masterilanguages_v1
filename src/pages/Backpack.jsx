import React, { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("fluent");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [sentences, setSentences] = useState(null);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [newWords, setNewWords] = useState([]);
  const [activeNewWord, setActiveNewWord] = useState(null);
  const [newWordMnemonics, setNewWordMnemonics] = useState(null);
  const [loadingMnemonics, setLoadingMnemonics] = useState(false);
  const [newWordImage, setNewWordImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [newWordCustomMnemonic, setNewWordCustomMnemonic] = useState("");
  const [lastImagePrompt, setLastImagePrompt] = useState("");
  const [imageApproved, setImageApproved] = useState(false);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const fluentWords = wordRatings.filter(w => w.times_practiced >= 5);
  const learningWords = wordRatings.filter(w => w.times_practiced > 0 && w.times_practiced < 5);

  const tabs = [
    { id: "fluent", label: "⭐ Fluent", count: fluentWords.length, color: "green" },
    { id: "learning", label: "📚 Learning", count: learningWords.length, color: "yellow" },
    { id: "pictures", label: "🖼️ Pictures", count: wordRatings.filter(w => w.image_url).length, color: "purple" },
  ];

  const getDisplayWords = () => {
    if (activeTab === "fluent") return fluentWords;
    if (activeTab === "learning") return learningWords;
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
        List each word separately with its meaning.`,
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
                        word: { type: "string" },
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

  const addToNewWords = (word, meaning) => {
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
    setNewWords(prev => [...prev, { word, meaning }]);
    toast.success(`"${word}" added to New Words! 📝`);
  };

  const handleNewWordRate = async (rating) => {
    if (!activeNewWord) return;
    
    await createWordMutation.mutateAsync({
      word: activeNewWord.word,
      translation: activeNewWord.meaning,
      phonetic: activeNewWord.word,
      category: "wordbank",
      times_practiced: rating,
      mastered: rating >= 5,
    });

    if (rating >= 5) {
      toast.success("Added to Fluent! ⭐");
      finishNewWord();
    } else {
      generateMnemonics(activeNewWord);
    }
  };

  const generateMnemonics = async (wordObj) => {
    setLoadingMnemonics(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 3 very short mnemonic phrases (MAX 5 words each) to remember the word "${wordObj.word}" which means "${wordObj.meaning}".
        Use the SOUND of the word to create memorable associations with OBJECTS or THINGS in English (not people's names).
        Keep each phrase to 5 words or less.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phrase: { type: "string" },
                  imagePrompt: { type: "string" }
                }
              }
            }
          }
        }
      });
      setNewWordMnemonics(result.suggestions);
    } catch (e) {
      console.error(e);
    }
    setLoadingMnemonics(false);
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
    setNewWordMnemonics(null);
    setNewWordImage(null);
    setImageApproved(false);
    setNewWordCustomMnemonic("");
    setLastImagePrompt("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={0} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold text-white">🎒 My Backpack</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
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
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {getDisplayWords().length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40 text-lg">
                {activeTab === "fluent" && "No fluent words yet. Rate words 5/5 to add them here!"}
                {activeTab === "learning" && "No words in progress. Start rating words!"}
                {activeTab === "pictures" && "No mnemonic pictures yet. Generate some while learning!"}
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
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all"
                >
                  <img src={word.image_url} alt={word.phonetic} className="w-full aspect-square object-cover" />
                  <div className="p-2 text-center">
                    <p className="text-cyan-400 font-medium">{word.phonetic || word.word}</p>
                    {expandedId === word.id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-green-400 font-medium mt-1"
                      >
                        = {word.translation}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            getDisplayWords().map((word) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-xl p-4 flex items-center justify-between ${
                  activeTab === "fluent" ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {word.image_url && (
                    <img src={word.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-cyan-400 font-bold">{word.phonetic || word.word}</p>
                    <p className="text-white/60 text-sm">{word.translation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {word.times_practiced >= 5 && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className={`w-2 h-2 rounded-full ${
                          word.times_practiced >= n ? "bg-cyan-500" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link to={createPageUrl("Home")}>
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500">
              <Gamepad2 className="w-4 h-4 mr-2" /> Continue Learning
            </Button>
          </Link>
          <Link to={createPageUrl("BabyVideos")}>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
              📺 Watch Videos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}