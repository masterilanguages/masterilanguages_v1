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
import TranslatorWidget from "../components/TranslatorWidget";

export default function Journal() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [questionsAsked, setQuestionsAsked] = useState([]);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
  const [synonyms, setSynonyms] = useState(null);
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [editingWord, setEditingWord] = useState(null);
  const [editValues, setEditValues] = useState({});
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

  // Get 10 most recent level 0 words (and allow levels 0-4 for future assignments)
  const suggestedVocab = backpackWords
    .filter(w => w.vocab_level >= 0 && w.vocab_level <= 4)
    .filter(w => w.vocab_level === 0)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

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

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backpackWords'] });
      toast.success("Word updated!");
      setEditingWord(null);
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

  // Check which vocab words are used (strict matching)
  useEffect(() => {
    const textLower = text.toLowerCase();
    const textWords = textLower.split(/\s+/).filter(w => w.length > 0);
    
    const found = suggestedVocab
      .filter(v => {
        // Check Hebrew word (exact match or full word contained)
        if (v.word) {
          const hebrewLower = v.word.toLowerCase();
          if (textWords.includes(hebrewLower)) return true;
        }
        
        // Check phonetic/transliteration (exact word match only)
        if (v.phonetic) {
          const phoneticLower = v.phonetic.toLowerCase();
          if (textWords.includes(phoneticLower)) return true;
        }
        
        // Check translation (exact word match only)
        if (v.translation) {
          const translationLower = v.translation.toLowerCase();
          if (textWords.includes(translationLower)) return true;
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
    if (sentences.length > 0 && text.length > 100 && !aiQuestion && !generatingQuestion) {
      const timer = setTimeout(() => {
        generateQuestion();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleSave = () => {
    if (!text.trim()) {
      toast.error("Please write something");
      return;
    }

    if (wordCount < 250) {
      toast.error(`Write at least 250 words! (${wordCount}/250)`);
      return;
    }

    if (usedWords.length < 10) {
      toast.error(`Use all 10 level 0 words before saving! (${usedWords.length}/10 used)`);
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

  const allWordsUsed = usedWords.length === 10 && wordCount >= 250;

  const getSynonyms = async (word) => {
    if (!word.trim()) return;
    
    setLoadingSynonyms(true);
    setSelectedWord(word);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Give me 5 Hebrew synonyms or alternative words for: "${word}"
        
Include both the Hebrew word and transliteration for each.
If the input is English, give Hebrew equivalents.
If the input is Hebrew, give other Hebrew words with similar meaning.

Make them useful for a Hebrew learner writing a journal.`,
        response_json_schema: {
          type: "object",
          properties: {
            synonyms: {
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
      });
      setSynonyms(result.synonyms);
    } catch (e) {
      toast.error("Failed to get synonyms");
    }
    setLoadingSynonyms(false);
  };

  const insertSynonym = (synonym) => {
    const textarea = document.querySelector('textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);
    setText(before + synonym + after);
    setSynonyms(null);
    toast.success("Word inserted!");
  };

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
          {/* Word Count */}
          <div className="mb-4 flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-white/60 text-sm">Word Count</span>
            <span className={`font-bold text-lg ${wordCount >= 250 ? 'text-green-400' : 'text-amber-400'}`}>
              {wordCount} / 250
            </span>
          </div>

          {/* Suggested Vocab */}
          {suggestedVocab.length > 0 && !showFeedback && (
            <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-white/80 text-sm mb-3">💡 Use these 10 level 0 words from your backpack:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedVocab.map((word) => {
                  const isUsed = usedWords.includes(word.id);
                  const isEditing = editingWord === word.id;
                  
                  if (isEditing) {
                    return (
                      <div
                        key={word.id}
                        className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50"
                      >
                        <input
                          autoFocus
                          value={editValues.phonetic ?? word.phonetic}
                          onChange={(e) => setEditValues({ ...editValues, phonetic: e.target.value })}
                          className="w-full bg-white/10 text-cyan-400 text-sm font-medium px-1 rounded mb-1"
                          placeholder="Phonetic"
                        />
                        <input
                          value={editValues.translation ?? word.translation}
                          onChange={(e) => setEditValues({ ...editValues, translation: e.target.value })}
                          className="w-full bg-white/10 text-white/80 text-xs px-1 rounded mb-1"
                          placeholder="Translation"
                        />
                        <input
                          value={editValues.word ?? word.word}
                          onChange={(e) => setEditValues({ ...editValues, word: e.target.value })}
                          className="w-full bg-white/10 text-white/60 text-xs px-1 rounded"
                          placeholder="Hebrew"
                        />
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => {
                              updateWordMutation.mutate({ id: word.id, data: editValues });
                            }}
                            className="text-xs bg-green-500/30 px-2 py-1 rounded hover:bg-green-500/50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingWord(null);
                              setEditValues({});
                            }}
                            className="text-xs bg-red-500/30 px-2 py-1 rounded hover:bg-red-500/50"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={word.id}
                      onClick={() => {
                        setEditingWord(word.id);
                        setEditValues({
                          phonetic: word.phonetic,
                          translation: word.translation,
                          word: word.word
                        });
                      }}
                      className={`px-3 py-2 rounded-lg transition-all cursor-pointer hover:bg-white/20 ${
                        isUsed 
                          ? "bg-green-500/20 border border-green-500/50" 
                          : "bg-white/10 border border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isUsed && <CheckCircle className="w-4 h-4 text-green-400" />}
                        <div className="flex flex-col">
                          <span className="text-cyan-400 text-sm font-medium">{word.phonetic}</span>
                          <span className="text-white/80 text-xs">{word.translation}</span>
                          <span className="text-white/60 text-xs">{word.word}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={`text-xs mt-3 ${usedWords.length >= 10 ? 'text-green-400' : 'text-amber-400'}`}>
                {usedWords.length}/10 words used {usedWords.length >= 10 ? '✓' : ''}
              </p>
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

          {/* Synonyms Panel */}
          <AnimatePresence>
            {synonyms && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white/80 font-medium">
                    💡 Synonyms for "{selectedWord}"
                  </h4>
                  <button
                    onClick={() => setSynonyms(null)}
                    className="text-white/40 hover:text-white/60"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {synonyms.map((syn, i) => (
                    <button
                      key={i}
                      onClick={() => insertSynonym(syn.hebrew)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left transition-all"
                    >
                      <div className="text-cyan-400 font-bold text-lg" dir="rtl">{syn.hebrew}</div>
                      <div className="text-white/60 text-sm">{syn.transliteration}</div>
                      <div className="text-white/50 text-xs">{syn.meaning}</div>
                    </button>
                  ))}
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
            onSelect={(e) => {
              const selected = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd).trim();
              if (selected && selected.split(/\s+/).length === 1) {
                setSelectedWord(selected);
              }
            }}
          />

          <div className="flex gap-3">
            <Button
              onClick={() => getSynonyms(selectedWord)}
              disabled={loadingSynonyms || !selectedWord}
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            >
              {loadingSynonyms ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
              ) : (
                <>💡 Get Synonyms</>
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
                <>Write 250 words + use 10 level 0 words ({wordCount}/250, {usedWords.length}/10) 🔒</>
              )}
            </Button>
          </div>

          <p className="text-white/40 text-xs mt-3 text-center">
            {allWordsUsed 
              ? (todayEntry ? "You can edit today's entry anytime" : "You can write only one entry per day")
              : `⚠️ You must write 250 words and use all 10 level 0 words to save your journal`
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