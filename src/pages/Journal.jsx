import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, Smile, Frown, Zap, Coffee, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

const moodIcons = {
  happy: { icon: Smile, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  sad: { icon: Frown, color: "text-blue-400", bg: "bg-blue-500/20" },
  excited: { icon: Zap, color: "text-purple-400", bg: "bg-purple-500/20" },
  tired: { icon: Coffee, color: "text-orange-400", bg: "bg-orange-500/20" },
  grateful: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/20" },
  stressed: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/20" }
};

export default function Journal() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("happy");
  const today = new Date().toISOString().split('T')[0];

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    }
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-date')
  });

  const createEntryMutation = useMutation({
    mutationFn: (entry) => base44.entities.JournalEntry.create(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setContent("");
      toast.success("Journal entry saved! 📖");
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JournalEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      toast.success("Entry updated! ✓");
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.JournalEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      toast.success("Entry deleted");
    }
  });

  const todayEntry = entries.find(e => e.date === today);

  const handleSave = () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    if (todayEntry) {
      updateEntryMutation.mutate({
        id: todayEntry.id,
        data: { content, mood: selectedMood }
      });
    } else {
      createEntryMutation.mutate({
        date: today,
        content,
        mood: selectedMood
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              My Journal
            </h1>
            <p className="text-white/60">Write about your day in Hebrew or English</p>
          </div>
        </div>

        {/* Today's Entry */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6"
        >
          <h2 className="text-white text-xl font-bold mb-4">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>

          {/* Mood Selector */}
          <div className="mb-4">
            <p className="text-white/60 text-sm mb-2">How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(moodIcons).map(([mood, { icon: Icon, color, bg }]) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    selectedMood === mood
                      ? `${bg} border-2 border-white/30 ${color}`
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5 inline mr-2" />
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Text Editor */}
          <Textarea
            value={content || todayEntry?.content || ""}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write about your day... What did you learn? How do you feel? Any new Hebrew words?"
            className="bg-white/5 border-white/20 text-white min-h-[200px] mb-4"
          />

          <Button
            onClick={handleSave}
            disabled={createEntryMutation.isPending || updateEntryMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-6"
          >
            {todayEntry ? "Update Today's Entry" : "Save Entry"} 📖
          </Button>
        </motion.div>

        {/* Previous Entries */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-sm font-medium">Previous Entries</h3>
          {entries
            .filter(e => e.date !== today)
            .map((entry, idx) => {
              const MoodIcon = moodIcons[entry.mood]?.icon || Smile;
              const moodColor = moodIcons[entry.mood]?.color || "text-yellow-400";
              const moodBg = moodIcons[entry.mood]?.bg || "bg-yellow-500/20";

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`${moodBg} p-2 rounded-lg`}>
                        <MoodIcon className={`w-5 h-5 ${moodColor}`} />
                      </div>
                      <span className="text-white font-medium">
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap">{entry.content}</p>
                </motion.div>
              );
            })}
        </div>
      </div>
    </div>
  );
}