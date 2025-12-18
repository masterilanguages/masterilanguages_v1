import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, ArrowLeft, Search, Trash2, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

export default function Library() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");

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
      return coins[0] || { coins: 0 };
    },
  });

  const { data: words = [] } = useQuery({
    queryKey: ['words'],
    queryFn: () => base44.entities.Word.list("-created_date"),
  });

  const createWordMutation = useMutation({
    mutationFn: (data) => base44.entities.Word.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      setNewWord("");
      setNewTranslation("");
      setNewYoutubeUrl("");
      toast.success("Word added!");
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Word deleted");
    },
  });

  const addWord = async () => {
    if (!newWord.trim()) return;
    
    let translation = newTranslation;
    if (!translation) {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the Hebrew word "${newWord}" to English. Just give the translation, nothing else.`,
        response_json_schema: { type: "object", properties: { translation: { type: "string" } } }
      });
      translation = result.translation;
    }

    createWordMutation.mutate({
      word: newWord,
      translation,
      phonetic: newWord,
      category: "basics",
      difficulty: "beginner",
      times_practiced: 0,
      youtube_url: newYoutubeUrl || undefined,
    });
  };

  const filteredWords = words.filter(w =>
    w.word?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.translation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.phonetic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Word Library</h1>
            <p className="text-white/60">{words.length} words saved</p>
          </div>
        </div>

        {/* Add word */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Hebrew word..."
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                placeholder="Translation (optional)"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={newYoutubeUrl}
                onChange={(e) => setNewYoutubeUrl(e.target.value)}
                placeholder="YouTube URL (optional)"
                className="bg-white/10 border-white/20 text-white flex-1"
              />
              <Button onClick={addWord} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words..."
            className="pl-10 bg-white/10 border-white/20 text-white"
          />
        </div>

        {/* Word list */}
        <div className="space-y-2">
          {filteredWords.map((word) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-xl text-cyan-400" dir="rtl">{word.word}</span>
                <span className="text-white/60">{word.phonetic}</span>
                <span className="text-white">{word.translation}</span>
              </div>
              <div className="flex items-center gap-2">
                {word.audio_url && (
                  <button
                    onClick={() => new Audio(word.audio_url).play()}
                    className="text-white/40 hover:text-white"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => deleteWordMutation.mutate(word.id)}
                  className="text-red-400/60 hover:text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}