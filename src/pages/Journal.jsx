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
import TranslatorWidget from "../components/TranslatorWidget";
import SignaturePad from "../components/journal/SignaturePad";
import JournalLeaderboard from "../components/journal/JournalLeaderboard";

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
  const [isPublic, setIsPublic] = useState(false);
  const [showPublicFeed, setShowPublicFeed] = useState(false);
  const [signature, setSignature] = useState("");
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

  const { data: publicEntries = [] } = useQuery({
    queryKey: ['publicJournalEntries'],
    queryFn: async () => {
      const allEntries = await base44.entities.JournalEntry.list('-date');
      return allEntries.filter(e => e.is_public === true);
    }
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
      queryClient.invalidateQueries({ queryKey: ['publicJournalEntries'] });
      setShowFeedback(true);
      toast.success("Journal entry saved! 📖");
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JournalEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['publicJournalEntries'] });
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
      setIsPublic(todayEntry.is_public || false);
      setSignature(todayEntry.signature_data || "");
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

    // Calculate consecutive days
    let consecutiveDays = 1;
    if (entries.length > 0) {
      const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
      for (let i = 0; i < sortedEntries.length - 1; i++) {
        const current = new Date(sortedEntries[i].date);
        const next = new Date(sortedEntries[i + 1].date);
        const dayDiff = Math.floor((current - next) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          consecutiveDays++;
        } else {
          break;
        }
      }
    }

    const entryData = {
      date: today,
      text,
      used_vocab_ids: usedWords,
      suggested_vocab_ids: suggestedVocab.map(v => v.id),
      ai_questions_asked: questionsAsked,
      last_edited_at: new Date().toISOString(),
      is_public: isPublic,
      author_name: userProfile?.avatar_name || "Anonymous",
      signature_data: signature,
      consecutive_days: consecutiveDays
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
              <BookOpen className="w-8 h-8" />
              Daily Journal
            </h1>
            <p className="text-white/60">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <JournalLeaderboard entries={entries} />
        </div>

        {/* Today's Entry - Notebook Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-amber-200 shadow-2xl p-8 mb-6 relative overflow-hidden"
        >
          {/* Notebook lines background layer - behind everything */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, #fbbf24 31px, #fbbf24 32px)`,
              backgroundSize: '100% 32px',
              backgroundPosition: '0 48px',
              zIndex: 0
            }}
          />
          
          {/* Red vertical line like notebook paper */}
          <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-red-400 opacity-40" style={{ zIndex: 0 }} />
          
          {/* Spiral binding holes */}
          <div className="absolute left-4 top-8 bottom-8 flex flex-col justify-around" style={{ zIndex: 1 }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-amber-300 border-2 border-amber-400" />
            ))}
          </div>
          
          {/* Content layer - above lines */}
          <div className="relative" style={{ zIndex: 2 }}>
          {/* Word Count - Top Right */}
          <div className="absolute top-2 right-4 bg-amber-50 rounded px-2 py-1 border border-amber-200 text-xs">
            <span className="text-amber-900 font-medium">Words: </span>
            <span className={`font-bold ${wordCount >= 250 ? 'text-green-600' : 'text-amber-600'}`}>
              {wordCount}/250
            </span>
          </div>

          {/* Text Editor */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write about your day..."
            className="bg-transparent border-none text-slate-800 min-h-[350px] mb-6 text-base ml-20 pr-24 focus:outline-none resize-none"
            style={{ 
              fontFamily: 'Georgia, serif',
              lineHeight: '32px',
              paddingTop: '16px',
              backgroundImage: 'none'
            }}
            onSelect={(e) => {
              const selected = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd).trim();
              if (selected && selected.split(/\s+/).length === 1) {
                setSelectedWord(selected);
              }
            }}
          />

          {/* Suggested Vocab - moved to bottom */}
          {suggestedVocab.length > 0 && !showFeedback && (
            <div className="mb-3 bg-blue-50 border border-blue-300 rounded-lg p-3 ml-20">
              <p className="text-blue-900 text-xs font-medium mb-2">💡 Use these 10 level 0 words:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedVocab.map((word) => {
                  const isUsed = usedWords.includes(word.id);
                  const isEditing = editingWord === word.id;
                  
                  if (isEditing) {
                    return (
                      <div
                        key={word.id}
                        className="px-2 py-1.5 rounded bg-cyan-100 border border-cyan-300"
                      >
                        <input
                          autoFocus
                          value={editValues.phonetic ?? word.phonetic}
                          onChange={(e) => setEditValues({ ...editValues, phonetic: e.target.value })}
                          className="w-full bg-white border border-cyan-300 text-cyan-700 text-xs font-medium px-1 rounded mb-1"
                          placeholder="Phonetic"
                        />
                        <input
                          value={editValues.translation ?? word.translation}
                          onChange={(e) => setEditValues({ ...editValues, translation: e.target.value })}
                          className="w-full bg-white border border-cyan-300 text-slate-700 text-[10px] px-1 rounded mb-1"
                          placeholder="Translation"
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => {
                              updateWordMutation.mutate({ id: word.id, data: editValues });
                            }}
                            className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded hover:bg-green-600"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingWord(null);
                              setEditValues({});
                            }}
                            className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded hover:bg-red-600"
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
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        isUsed 
                          ? "bg-green-100 border border-green-400" 
                          : "bg-white border border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isUsed && <CheckCircle className="w-3 h-3 text-green-600" />}
                        <div className="flex flex-col">
                          <span className="text-cyan-700 text-xs font-medium">{word.phonetic}</span>
                          <span className="text-slate-600 text-[10px]">{word.translation}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={`text-[10px] mt-2 font-medium ${usedWords.length >= 10 ? 'text-green-600' : 'text-amber-600'}`}>
                {usedWords.length}/10 used {usedWords.length >= 10 ? '✓' : ''}
              </p>
            </div>
          )}

          {/* Signature - Bottom Right */}
          <div className="flex justify-end mb-3">
            <div className="w-48">
              <SignaturePad 
                value={signature} 
                onChange={setSignature}
                disabled={wordCount < 250}
              />
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-300 rounded-lg p-2 ml-20">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-3 h-3"
            />
            <label htmlFor="isPublic" className="text-blue-900 text-xs cursor-pointer flex-1">
              I don't mind if others see my journal entry, it will motivate them to write as well
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-20">
            <Button
              onClick={() => getSynonyms(selectedWord)}
              disabled={loadingSynonyms || !selectedWord}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              {loadingSynonyms ? <Loader2 className="w-3 h-3 animate-spin" /> : "💡"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createEntryMutation.isPending || updateEntryMutation.isPending || !text.trim() || !allWordsUsed}
              className={`flex-1 font-bold text-sm py-3 ${
                allWordsUsed 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              {allWordsUsed ? (
                <>{todayEntry ? "Update" : "Save"} 📖</>
              ) : (
                <>Write 250 words + 10 words ({wordCount}/250, {usedWords.length}/10) 🔒</>
              )}
            </Button>
          </div>

          {!allWordsUsed && (
            <p className="text-slate-600 text-[10px] mt-2 text-center ml-20">
              ⚠️ Use all 10 level 0 words above to submit
            </p>
          )}
          </div>
        </motion.div>

        {/* Coach Mark's Hebrew Journal - Public Feed */}
        {publicEntries.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowPublicFeed(!showPublicFeed)}
              className="w-full bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-4 mb-3 flex items-center justify-between hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-medium">Coach Mark's Hebrew Journal</h3>
                <span className="text-purple-400 text-sm">({publicEntries.length} entries)</span>
              </div>
              <span className="text-white/60">{showPublicFeed ? '▼' : '▶'}</span>
            </button>

            {showPublicFeed && (
              <div className="space-y-3">
                {publicEntries.slice(0, 10).map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-medium">{entry.author_name || "Anonymous"}</span>
                        <span className="text-white/40 text-xs">
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      {entry.used_vocab_ids?.length > 0 && (
                        <span className="text-green-400 text-xs">
                          ✓ {entry.used_vocab_ids.length} words
                        </span>
                      )}
                    </div>
                    <p className="text-white/80 whitespace-pre-wrap line-clamp-4" style={{ fontFamily: 'Georgia, serif' }}>{entry.text}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Previous Entries */}
        {entries.filter(e => e.date !== today).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white/60 text-sm font-medium">My Previous Entries</h3>
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
                    <div className="flex items-center gap-2">
                      {entry.used_vocab_ids?.length > 0 && (
                        <span className="text-green-400 text-xs">
                          ✓ {entry.used_vocab_ids.length} words used
                        </span>
                      )}
                      <button
                        onClick={() => {
                          updateEntryMutation.mutate({
                            id: entry.id,
                            data: { is_public: !entry.is_public, author_name: userProfile?.avatar_name || "Anonymous" }
                          });
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          entry.is_public 
                            ? 'bg-purple-500/30 text-purple-400 hover:bg-purple-500/50' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {entry.is_public ? '📢 Public' : '🔒 Private'}
                      </button>
                    </div>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap line-clamp-3" style={{ fontFamily: 'Georgia, serif' }}>{entry.text}</p>
                </motion.div>
              ))}
          </div>
        )}
        </div>
        </div>
        );
        }