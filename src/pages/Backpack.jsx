import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Star, BookOpen, Image, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";
import { Button } from "@/components/ui/button";

export default function Backpack() {
  const [activeTab, setActiveTab] = useState("fluent");

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
    return [];
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
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <img src={word.image_url} alt={word.phonetic} className="w-full aspect-square object-cover" />
                  <div className="p-2 text-center">
                    <p className="text-cyan-400 font-medium">{word.phonetic || word.word}</p>
                    <p className="text-white/60 text-sm">{word.translation}</p>
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