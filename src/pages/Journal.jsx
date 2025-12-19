import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

export default function Journal() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [questionsAsked, setQuestionsAsked] = useState([]);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
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

  const { data: backpackWords = [] } = useQuery({
    queryKey: ['backpackWords'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" })
  });

  const todayEntry = entries.find(e => e.date === today);

  // Get suggested vocab (latest 5-10, prioritize lower-ranked)
  const suggestedVocab = backpackWords
    .sort((a, b) => {
      const rankDiff = (a.times_practiced || 0) - (b.times_practiced || 0);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.created_date) - new Date(a.created_date);
    })
    .slice(0, 8);

  const createEntryMutation = useMutation({
    mutationFn: (entry) => base44.entities.JournalEntry.create(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowFeedback(true);
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

  // Load today's entry if exists
  useEffect(() => {
    if (todayEntry) {
      setText(todayEntry.text || "");
      setQuestionsAsked(todayEntry.ai_questions_asked || []);
      setUsedWords(todayEntry.used_vocab_ids || []);
    }
  }, [todayEntry]);

  // Check which vocab words are used (fuzzy matching)
  useEffect(() => {
    const textLower = text.toLowerCase();
    const found = suggestedVocab
      .filter(v => {
        // Check Hebrew word
        if (v.word && textLower.includes(v.word.toLowerCase())) return true;
        
        // Check phonetic (allow partial matches - at least 80% of characters)
        if (v.phonetic) {
          const phoneticLower = v.phonetic.toLowerCase();
          const minLength = Math.floor(phoneticLower.length * 0.8);
          for (let i = 0; i <= phoneticLower.length - minLength; i++) {
            const substr = phoneticLower.substring(i, i + minLength);
            if (textLower.includes(substr)) return true;
          }
        }
        
        // Check translation (allow partial matches for longer words)
        if (v.translation) {
          const translationLower = v.translation.toLowerCase();
          if (translationLower.length <= 4) {
            // Short words must match exactly
            if (textLower.includes(translationLower)) return true;
          } else {
            // Longer words can be partial (at least 70%)
            const minLength = Math.floor(translationLower.length * 0.7);
            for (let i = 0; i <= translationLower.length - minLength; i++) {
              const substr = translationLower.substring(i, i + minLength);
              if (textLower.includes(substr)) return true;
            }
          }
        }
        
        return false;
      })
      .map(v => v.id);
    setUsedWords(found);
  }, [text, suggestedVocab]);

  const generateQuestion = async () => {
    if (!text.trim()) return;
    
    setGeneratingQuestion(true);
    try {
      const isHebrewHeavy = (text.match(/[\u0590-\u05FF]/g) || []).length > text.length * 0.3;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      const lastSentence = sentences[sentences.length - 1]?.trim() || text.trim();
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `The user just wrote: "${lastSentence}"

Their full entry so far: "${text}"

Previous questions: ${questionsAsked.join(", ") || "none"}

Generate ONE simple follow-up question about their LAST SENTENCE specifically.
${isHebrewHeavy ? "Ask in Hebrew." : "Ask in English."}

Rules:
- Focus on what they JUST wrote
- Very short and simple
- Ask about feelings, details, or what happened next
- Examples: "איך הרגשת?" / "What happened next?" / "Who was with you?"

Return just the question.`,
        response_json_schema: {
          type: "object",
          properties: {
            question: { type: "string" }
          }
        }
      });

      setAiQuestion(result.question);
      setQuestionsAsked([...questionsAsked, result.question]);
    } catch (e) {
      toast.error("Failed to generate question");
    }
    setGeneratingQuestion(false);
  };

  // Auto-generate question after writing
  useEffect(() => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > 0 && sentences.length % 2 === 0 && !aiQuestion && !generatingQuestion) {
      const timer = setTimeout(() => {
        generateQuestion();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Please write something");
      return;
    }

    if (usedWords.length < suggestedVocab.length) {
      toast.error(`Use all ${suggestedVocab.length} words before saving! (${usedWords.length}/${suggestedVocab.length} used)`);
      return;
    }

    const entryData = {
      date: today,
      text,
      used_vocab_ids: usedWords,
      suggested_vocab_ids: suggestedVocab.map(v => v.id),
      ai_questions_asked: questionsAsked,
      last_edited_at: new Date().toISOString()
    };

    if (todayEntry) {
      updateEntryMutation.mutate({ id: todayEntry.id, data: entryData });
    } else {
      createEntryMutation.mutate(entryData);
    }
  };

  const allWordsUsed = usedWords.length === suggestedVocab.length;

  const unusedVocab = suggestedVocab.filter(v => !usedWords.includes(v.id));

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
              Daily Journal
            </h1>
            <p className="text-white/60">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Today's Entry */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6"
        >
          {/* Suggested Vocab */}
          {suggestedVocab.length > 0 && !showFeedback && (
            <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-white/80 text-sm mb-3">💡 Try using these words from your backpack:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedVocab.map((word) => {
                  const isUsed = usedWords.includes(word.id);
                  return (
                    <div
                      key={word.id}
                      className={`px-3 py-2 rounded-lg transition-all ${
                        isUsed 
                          ? "bg-green-500/20 border border-green-500/50" 
                          : "bg-white/10 border border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isUsed && <CheckCircle className="w-4 h-4 text-green-400" />}
                        <div>
                          <span className="text-cyan-400 font-bold" dir="rtl">{word.word}</span>
                          <span className="text-white/60 text-sm ml-2">({word.phonetic})</span>
                          <p className="text-white/50 text-xs">{word.translation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {usedWords.length === 0 && text.length > 50 && (
                <p className="text-amber-400 text-xs mt-2">
                  💭 Try using at least one of today's words ☺️
                </p>
              )}
            </div>
          )}

          {/* Feedback after save */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4"
              >
                <h3 className="text-white font-bold text-lg mb-2">Great job! 🎉</h3>
                <p className="text-white/80 mb-2">
                  You used {usedWords.length} out of {suggestedVocab.length} suggested words today 👏
                </p>
                {unusedVocab.length > 0 && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Want to try using next time?</p>
                    <div className="flex flex-wrap gap-2">
                      {unusedVocab.slice(0, 3).map((word) => (
                        <div key={word.id} className="bg-white/10 px-3 py-1 rounded-lg">
                          <span className="text-cyan-400 font-bold" dir="rtl">{word.word}</span>
                          <span className="text-white/60 text-sm ml-2">({word.phonetic})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => setShowFeedback(false)}
                  variant="outline"
                  className="mt-3 border-white/20 text-white"
                  size="sm"
                >
                  Continue Editing
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Question */}
          <AnimatePresence>
            {aiQuestion && !showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-white/80">{aiQuestion}</p>
                  </div>
                  <button
                    onClick={() => setAiQuestion("")}
                    className="text-white/40 hover:text-white/60"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text Editor */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write about your day... What did you do? How do you feel? Try using some of the suggested words above..."
            className="bg-white/5 border-white/20 text-white min-h-[250px] mb-4 text-lg leading-relaxed"
          />

          <div className="flex gap-3">
            <Button
              onClick={generateQuestion}
              disabled={generatingQuestion || !text.trim()}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              {generatingQuestion ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Ask me about what I wrote</>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createEntryMutation.isPending || updateEntryMutation.isPending || !text.trim() || !allWordsUsed}
              className={`flex-1 font-bold py-6 ${
                allWordsUsed 
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                  : "bg-gray-500/20 text-gray-400 cursor-not-allowed"
              }`}
            >
              {allWordsUsed ? (
                <>{todayEntry ? "Update Today's Journal" : "Save Journal Entry"} 📖</>
              ) : (
                <>Use all {suggestedVocab.length} words first ({usedWords.length}/{suggestedVocab.length}) 🔒</>
              )}
            </Button>
          </div>

          <p className="text-white/40 text-xs mt-3 text-center">
            {allWordsUsed 
              ? (todayEntry ? "You can edit today's entry anytime" : "You can write only one entry per day")
              : `⚠️ You must use all ${suggestedVocab.length} suggested words to save your journal`
            }
          </p>
        </motion.div>

        {/* Previous Entries */}
        {entries.filter(e => e.date !== today).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white/60 text-sm font-medium">Previous Entries</h3>
            {entries
              .filter(e => e.date !== today)
              .slice(0, 10)
              .map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {new Date(entry.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    {entry.used_vocab_ids?.length > 0 && (
                      <span className="text-green-400 text-xs">
                        ✓ {entry.used_vocab_ids.length} words used
                      </span>
                    )}
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap line-clamp-3">{entry.text}</p>
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}