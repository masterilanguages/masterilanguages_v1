import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Lazy load heavy components for faster initial load
const TranslatorWidget = lazy(() => import("../components/TranslatorWidget"));
const SignaturePad = lazy(() => import("../components/journal/SignaturePad"));
const JournalLeaderboard = lazy(() => import("../components/journal/JournalLeaderboard"));

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
  const [wordTranslation, setWordTranslation] = useState(null);
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
  const [translatingWord, setTranslatingWord] = useState(false);
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
      const allEntries = await base44.entities.JournalEntry.filter({ is_public: true }, '-date', 10);
      return allEntries;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const todayEntry = useMemo(() => entries.find(e => e.date === today), [entries, today]);

  // Get 10 most recent level 0 words - memoized
  const suggestedVocab = useMemo(() => 
    backpackWords
      .filter(w => w.vocab_level === 0)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 10),
    [backpackWords]
  );

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

  // Check which vocab words are used - debounced for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      const textLower = text.toLowerCase();
      const textWords = new Set(textLower.split(/\s+/).filter(w => w.length > 0));
      
      const found = suggestedVocab
        .filter(v => {
          if (v.word && textWords.has(v.word.toLowerCase())) return true;
          if (v.phonetic && textWords.has(v.phonetic.toLowerCase())) return true;
          if (v.translation && textWords.has(v.translation.toLowerCase())) return true;
          return false;
        })
        .map(v => v.id);
      setUsedWords(found);
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timer);
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

    if (wordCount < 100) {
      toast.error(`Write at least 100 words! (${wordCount}/100)`);
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

  const allWordsUsed = usedWords.length === 10 && wordCount >= 100;

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

  const getWordAtPosition = (text, position) => {
    const before = text.slice(0, position);
    const after = text.slice(position);
    const wordBefore = before.match(/[\u0590-\u05FF\w]+$/)?.[0] || "";
    const wordAfter = after.match(/^[\u0590-\u05FF\w]+/)?.[0] || "";
    return wordBefore + wordAfter;
  };

  const handleTextClick = async (e) => {
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const clickedWord = getWordAtPosition(text, cursorPos);
    
    if (!clickedWord || clickedWord.length < 2) return;
    
    const rect = textarea.getBoundingClientRect();
    const textBeforeCursor = text.slice(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const lineHeight = 28.8; // 1.8 line-height * 16px base
    const y = rect.top + (currentLine * lineHeight) + 40;
    const x = rect.left + 100;
    
    setTranslationPosition({ x, y });
    setTranslatingWord(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this word to English: "${clickedWord}". Return only the translation, nothing else.`
      });
      setWordTranslation({ word: clickedWord, translation: result });
    } catch (e) {
      toast.error("Translation failed");
    } finally {
      setTranslatingWord(false);
    }
  };

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

        {/* Leaderboard - Lazy loaded */}
        <Suspense fallback={<div className="mb-6 h-32 bg-white/5 rounded-2xl animate-pulse" />}>
          <div className="mb-6">
            <JournalLeaderboard entries={entries} />
          </div>
        </Suspense>

        {/* Today's Entry - Clean Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-amber-200 shadow-2xl p-6 mb-6 relative"
        >
          {/* Word Count - Top Right */}
          <div className="absolute top-4 right-4 bg-amber-50 rounded px-2 py-1 border border-amber-200 text-xs">
            <span className="text-amber-900 font-medium">Words: </span>
            <span className={`font-bold ${wordCount >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
              {wordCount}/100
            </span>
          </div>

          {/* Text Editor - Centered */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onClick={handleTextClick}
            placeholder="Write about your day..."
            className="bg-transparent border-none text-slate-800 min-h-[400px] mb-4 text-base w-full focus:outline-none resize-none"
            style={{ 
              fontFamily: 'Georgia, serif',
              lineHeight: '1.8',
              paddingTop: '40px',
              paddingRight: '80px'
            }}
            onSelect={(e) => {
              const selected = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd).trim();
              if (selected && selected.split(/\s+/).length === 1) {
                setSelectedWord(selected);
              }
            }}
          />

          {/* Suggested Vocab - Bottom Circles */}
          {suggestedVocab.length > 0 && !showFeedback && (
            <div className="mb-4">
              <p className="text-slate-600 text-xs text-center mb-2">Required words ({usedWords.length}/10):</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedVocab.map((word) => {
                  const isUsed = usedWords.includes(word.id);
                  const isEditing = editingWord === word.id;
                  
                  return (
                    <div
                      key={word.id}
                      onClick={() => {
                        if (isEditing) {
                          setEditingWord(null);
                          setEditValues({});
                        } else {
                          setEditingWord(word.id);
                          setEditValues({
                            phonetic: word.phonetic,
                            translation: word.translation,
                            word: word.word
                          });
                        }
                      }}
                      className={`w-16 h-16 rounded-full transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                        isUsed 
                          ? "bg-green-100 border-2 border-green-400" 
                          : "bg-slate-100 border-2 border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {isUsed && <CheckCircle className="w-3 h-3 text-green-600 absolute top-1 right-1" />}
                      
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editValues.phonetic ?? word.phonetic}
                            onChange={(e) => setEditValues({ ...editValues, phonetic: e.target.value })}
                            className="w-14 bg-white border border-cyan-300 text-cyan-700 text-[10px] font-medium px-1 py-0.5 rounded text-center"
                            placeholder="Word"
                            onBlur={() => {
                              updateWordMutation.mutate({ id: word.id, data: editValues });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateWordMutation.mutate({ id: word.id, data: editValues });
                              }
                            }}
                          />
                          <input
                            value={editValues.translation ?? word.translation}
                            onChange={(e) => setEditValues({ ...editValues, translation: e.target.value })}
                            className="w-14 bg-white border border-cyan-300 text-slate-700 text-[9px] px-1 py-0.5 rounded text-center"
                            placeholder="Meaning"
                            onBlur={() => {
                              updateWordMutation.mutate({ id: word.id, data: editValues });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateWordMutation.mutate({ id: word.id, data: editValues });
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-cyan-700 text-xs font-bold">{word.phonetic}</span>
                          {isEditing && <span className="text-slate-600 text-[9px] mt-0.5">{word.translation}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signature - Bottom Right - Lazy loaded */}
          <div className="flex justify-end mb-3">
            <div className="w-48">
              <Suspense fallback={<div className="h-20 bg-slate-100 rounded-lg animate-pulse" />}>
                <SignaturePad 
                  value={signature} 
                  onChange={setSignature}
                  disabled={wordCount < 100}
                />
              </Suspense>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isPublic" className="text-slate-700 text-sm cursor-pointer">
              Click here to let others see my journal entry
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
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
              className={`font-bold text-sm py-3 px-8 ${
                allWordsUsed 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              {allWordsUsed ? (
                <>{todayEntry ? "Update" : "Save"} 📖</>
              ) : (
                <>⚠️ Write 100 words with 10 vocab words ({wordCount}/100, {usedWords.length}/10) 🔒</>
              )}
            </Button>
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

        {/* Previous Entries - Reduced animations */}
        {entries.filter(e => e.date !== today).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white/60 text-sm font-medium">My Previous Entries</h3>
            {entries
              .filter(e => e.date !== today)
              .slice(0, 5)
              .map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
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

      {/* Translation Tooltip */}
        {(wordTranslation || translatingWord) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: translationPosition.x,
              top: translationPosition.y,
              zIndex: 1000
            }}
            className="bg-slate-800 text-white rounded-lg shadow-2xl p-3 border border-cyan-400"
          >
            {translatingWord ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Translating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-cyan-400 font-bold text-sm">{wordTranslation.word}</p>
                  <p className="text-white text-xs">{wordTranslation.translation}</p>
                </div>
                <button
                  onClick={() => setWordTranslation(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            </motion.div>
            )}

      {/* Translator Widget - Lazy loaded */}
      <Suspense fallback={null}>
        <TranslatorWidget />
      </Suspense>
            </div>
            );
            }