import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, Loader2, CheckCircle, X, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TranslatorWidget = lazy(() => import("../components/TranslatorWidget"));
const SignaturePad = lazy(() => import("../components/journal/SignaturePad"));

const languageNames = {
  hebrew: 'Hebrew', english: 'English', spanish: 'Spanish',
  french: 'French', portuguese: 'Portuguese', italian: 'Italian'
};

export default function Journal() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [questionsAsked, setQuestionsAsked] = useState([]);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [showPublicFeed, setShowPublicFeed] = useState(false);
  const [signature, setSignature] = useState("");
  const [wordTranslation, setWordTranslation] = useState(null);
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
  const [translatingWord, setTranslatingWord] = useState(false);
  const [translatingEntry, setTranslatingEntry] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [showTranslated, setShowTranslated] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-date')
  });

  // Fetch latest 10 words from flashcards (wordbank), sorted by newest first
  const { data: backpackWords = [] } = useQuery({
    queryKey: ['backpackWords', userProfile?.language],
    queryFn: async () => {
      const allWords = await base44.entities.Word.filter({ category: "wordbank" });
      // Filter by language if set, otherwise show all (backwards compat)
      const userLang = userProfile?.language || 'hebrew';
      const byLang = allWords.filter(w => w.language === userLang);
      return byLang.length > 0 ? byLang : allWords;
    },
    enabled: !!userProfile,
  });

  const { data: publicEntries = [] } = useQuery({
    queryKey: ['publicJournalEntries'],
    queryFn: async () => base44.entities.JournalEntry.filter({ is_public: true }, '-date', 10),
    staleTime: 60000,
  });

  const todayEntry = useMemo(() => entries.find(e => e.date === today), [entries, today]);

  // Get 10 most recently ADDED words to the backpack/flashcards
  const suggestedVocab = useMemo(() =>
    [...backpackWords]
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

  // Check which vocab words are used
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
    }, 300);
    return () => clearTimeout(timer);
  }, [text, suggestedVocab]);

  const generateQuestion = async () => {
    if (!text.trim()) return;
    setGeneratingQuestion(true);
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      const lastSentence = sentences[sentences.length - 1]?.trim() || text.trim();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `The user just wrote: "${lastSentence}"\nFull entry: "${text}"\nPrevious questions: ${questionsAsked.join(", ") || "none"}\nGenerate ONE simple follow-up question about their last sentence. Ask in English. Keep it short. Return just the question.`,
        response_json_schema: { type: "object", properties: { question: { type: "string" } } }
      });
      setAiQuestion(result.question);
      setQuestionsAsked([...questionsAsked, result.question]);
    } catch (e) {
      toast.error("Failed to generate question");
    }
    setGeneratingQuestion(false);
  };

  useEffect(() => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > 0 && text.length > 100 && !aiQuestion && !generatingQuestion) {
      const timer = setTimeout(() => generateQuestion(), 3000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  // Translate the full entry to learning language
  const handleTranslateEntry = async () => {
    if (!text.trim()) return;
    const lang = userProfile?.language || 'hebrew';
    const langName = languageNames[lang] || lang;
    setTranslatingEntry(true);
    setShowTranslated(false);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the following English text to ${langName}. Keep it natural and conversational. Return only the translation:\n\n"${text}"`
      });
      setTranslatedText(result);
      setShowTranslated(true);
    } catch (e) {
      toast.error("Translation failed");
    }
    setTranslatingEntry(false);
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleSave = () => {
    if (!text.trim()) { toast.error("Please write something"); return; }
    if (wordCount < 100) { toast.error(`Write at least 100 words! (${wordCount}/100)`); return; }
    if (usedWords.length < Math.min(10, suggestedVocab.length)) {
      toast.error(`Use more vocab words before saving! (${usedWords.length}/${Math.min(10, suggestedVocab.length)} used)`);
      return;
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
    };

    if (todayEntry) {
      updateEntryMutation.mutate({ id: todayEntry.id, data: entryData });
    } else {
      createEntryMutation.mutate(entryData);
    }
  };

  const allWordsUsed = usedWords.length >= Math.min(10, suggestedVocab.length) && wordCount >= 100;

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
    const lineHeight = 28.8;
    const y = rect.top + (currentLine * lineHeight) + 40;
    const x = rect.left + 100;
    setTranslationPosition({ x, y });
    setTranslatingWord(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this word to English: "${clickedWord}". Return only the translation.`
      });
      setWordTranslation({ word: clickedWord, translation: result });
    } catch (e) {
      toast.error("Translation failed");
    } finally {
      setTranslatingWord(false);
    }
  };

  const langName = languageNames[userProfile?.language] || 'target language';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 50%, #eae6da 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} style={{ color: '#6b7c5a' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 500 }}>
              <BookOpen className="w-7 h-7" />
              Daily Journal
            </h1>
            <p className="text-sm" style={{ color: '#6b7c5a' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── NOTEBOOK ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl shadow-2xl overflow-hidden mb-6"
          style={{
            background: '#fffef5',
            border: '1px solid #e0d8c8',
            boxShadow: '4px 6px 24px rgba(61,74,46,0.12), inset 0 0 0 1px rgba(255,255,255,0.8)'
          }}
        >
          {/* Red margin line */}
          <div className="absolute left-14 top-0 bottom-0 w-px" style={{ background: 'rgba(200,100,100,0.25)' }} />
          {/* Blue ruled lines */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{
                top: `${80 + i * 32}px`,
                height: '1px',
                background: 'rgba(100,140,200,0.15)'
              }}
            />
          ))}

          {/* Notebook top strip */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3" style={{ borderBottom: '2px solid rgba(200,180,140,0.4)' }}>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: '#9b7e5a' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b7e5a', fontFamily: 'Jost, sans-serif' }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${wordCount >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {wordCount} / 100 words
              </span>
              {/* Translate to learning language button */}
              <button
                onClick={handleTranslateEntry}
                disabled={translatingEntry || !text.trim()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'rgba(90,107,90,0.12)', color: '#5a6b5a', border: '1px solid rgba(90,107,90,0.25)', fontFamily: 'Jost, sans-serif' }}
                title={`Translate to ${langName}`}
              >
                {translatingEntry ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                {translatingEntry ? 'Translating...' : `→ ${langName}`}
              </button>
            </div>
          </div>

          {/* Translated text panel */}
          <AnimatePresence>
            {showTranslated && translatedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-10 mx-6 mt-3 rounded-xl p-4 text-sm"
                style={{ background: 'rgba(90,107,90,0.07)', border: '1px solid rgba(90,107,90,0.2)', fontFamily: 'Georgia, serif', color: '#3d4a2e', lineHeight: '1.8' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>{langName} Translation</span>
                  <button onClick={() => setShowTranslated(false)} style={{ color: '#9b7e5a' }}><X className="w-3.5 h-3.5" /></button>
                </div>
                <p dir={userProfile?.language === 'hebrew' ? 'rtl' : 'ltr'}>{translatedText}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Writing area */}
          <div className="relative z-10 pl-16 pr-6 pt-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onClick={handleTextClick}
              placeholder="Write about your day in English..."
              className="w-full bg-transparent border-none shadow-none focus:outline-none focus:ring-0 resize-none"
              style={{
                fontFamily: 'Georgia, serif',
                lineHeight: '32px',
                fontSize: '15px',
                color: '#2d3a1e',
                minHeight: '480px',
                padding: '4px 0',
              }}
            />
          </div>

          {/* Vocab word bubbles */}
          {suggestedVocab.length > 0 && (
            <div className="relative z-10 px-6 pb-4 pt-2" style={{ borderTop: '1px dashed rgba(200,180,140,0.5)' }}>
              <p className="text-xs mb-3 text-center font-semibold tracking-wide uppercase" style={{ color: '#9b7e5a', fontFamily: 'Jost, sans-serif' }}>
                Your latest words — use them in your entry ({usedWords.length}/{suggestedVocab.length})
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedVocab.map((word) => {
                  const isUsed = usedWords.includes(word.id);
                  return (
                    <motion.div
                      key={word.id}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        // Insert word into text at cursor
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const before = text.substring(0, start);
                          const after = text.substring(start);
                          const insert = word.phonetic || word.word;
                          setText(before + insert + ' ' + after);
                        } else {
                          setText(t => t + ' ' + (word.phonetic || word.word));
                        }
                      }}
                      className="flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all px-3 py-2 min-w-[64px]"
                      style={{
                        background: isUsed ? 'rgba(90,160,90,0.12)' : 'rgba(255,252,240,0.9)',
                        border: isUsed ? '1.5px solid rgba(90,160,90,0.5)' : '1.5px solid rgba(200,180,140,0.5)',
                        boxShadow: isUsed ? 'none' : '0 1px 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      {isUsed && <CheckCircle className="w-3 h-3 mb-0.5" style={{ color: '#5a9a5a' }} />}
                      <span className="text-xs font-bold" style={{ color: isUsed ? '#3a7a3a' : '#5a6b5a', fontFamily: 'Jost, sans-serif' }}>
                        {word.phonetic || word.word}
                      </span>
                      <span className="text-[10px]" style={{ color: '#9b7e5a' }}>{word.translation}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Question bubble */}
          <AnimatePresence>
            {(aiQuestion || generatingQuestion) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative z-10 mx-6 mb-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(212,165,116,0.15)', border: '1px solid rgba(212,165,116,0.4)' }}
              >
                {generatingQuestion ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#9b7e5a' }} />
                    <span className="text-xs" style={{ color: '#9b7e5a' }}>Thinking of a question…</span>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm italic" style={{ color: '#6b4e2a', fontFamily: 'Georgia, serif' }}>✍️ {aiQuestion}</p>
                    <button onClick={() => setAiQuestion("")} style={{ color: '#9b7e5a' }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signature + controls */}
          <div className="relative z-10 px-6 pb-5 pt-2 flex items-end justify-between gap-4" style={{ borderTop: '1px solid rgba(200,180,140,0.3)' }}>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="isPublic" className="text-xs cursor-pointer" style={{ color: '#9b7e5a', fontFamily: 'Jost, sans-serif' }}>Share publicly</label>
            </div>

            <div className="flex items-end gap-4">
              <div className="w-40">
                <Suspense fallback={<div className="h-16 rounded animate-pulse" style={{ background: 'rgba(200,180,140,0.2)' }} />}>
                  <SignaturePad value={signature} onChange={setSignature} disabled={wordCount < 100} />
                </Suspense>
              </div>
              <Button
                onClick={handleSave}
                disabled={createEntryMutation.isPending || updateEntryMutation.isPending || !text.trim() || !allWordsUsed}
                className="font-semibold text-sm"
                style={allWordsUsed
                  ? { background: '#5a6b5a', color: 'white', fontFamily: 'Jost, sans-serif' }
                  : { background: 'rgba(200,180,140,0.3)', color: '#9b7e5a', fontFamily: 'Jost, sans-serif' }
                }
              >
                {allWordsUsed ? (todayEntry ? "Update" : "Save Entry") : `⚠️ ${wordCount}/100 words · ${usedWords.length}/${suggestedVocab.length} vocab`}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Previous Entries */}
        {entries.filter(e => e.date !== today).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: '#9b7e5a', fontFamily: 'Jost, sans-serif' }}>Previous Entries</h3>
            {entries.filter(e => e.date !== today).slice(0, 5).map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,254,245,0.8)', border: '1px solid rgba(200,180,140,0.4)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, serif' }}>
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => updateEntryMutation.mutate({ id: entry.id, data: { is_public: !entry.is_public, author_name: userProfile?.avatar_name || "Anonymous" } })}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: entry.is_public ? 'rgba(90,107,90,0.15)' : 'rgba(200,180,140,0.2)', color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}
                  >
                    {entry.is_public ? '📢 Public' : '🔒 Private'}
                  </button>
                </div>
                <p className="text-sm line-clamp-3" style={{ color: '#3d4a2e', fontFamily: 'Georgia, serif', lineHeight: '1.7' }}>{entry.text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Word click translation tooltip */}
      {(wordTranslation || translatingWord) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ position: 'fixed', left: translationPosition.x, top: translationPosition.y, zIndex: 1000 }}
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
              <button onClick={() => setWordTranslation(null)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      <Suspense fallback={null}>
        <TranslatorWidget />
      </Suspense>
    </div>
  );
}