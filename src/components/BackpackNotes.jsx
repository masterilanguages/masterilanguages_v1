import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BackpackNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(() => {
    try { return JSON.parse(localStorage.getItem("backpack_pending") || "[]"); } catch { return []; }
  });
  const [saving, setSaving] = useState(null);
  const [userLanguage, setUserLanguage] = useState("hebrew");

  useEffect(() => {
    base44.entities.UserProfile.list().then(profiles => {
      if (profiles[0]?.language) setUserLanguage(profiles[0].language);
    }).catch(() => {});
  }, []);

  const savePending = (list) => {
    setPending(list);
    localStorage.setItem("backpack_pending", JSON.stringify(list));
  };

  const addWord = () => {
    const word = input.trim();
    if (!word) return;
    const updated = [...pending, word];
    savePending(updated);
    setInput("");
  };

  const removeWord = (idx) => {
    savePending(pending.filter((_, i) => i !== idx));
  };

  const saveToBackpack = async (word, idx) => {
    setSaving(idx);
    const lang = userLanguage || "hebrew";
    const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `The user is learning ${langCap}. They typed: "${word}"

Detect which case this is:
1. English word/phrase - translate TO ${langCap}
2. ${langCap} word in native script - translate TO English
3. Transliterated/phonetic form of a ${langCap} word (Latin letters but sounds like ${langCap}) - identify the ${langCap} word and translate to English

Always return ALL three fields:
- native: the word in ${langCap} WITH full native script (e.g. Hebrew with nikud vowel marks). REQUIRED.
- transliteration: phonetic Latin-letter spelling. REQUIRED.
- english: clear English meaning/translation. REQUIRED.`,
        response_json_schema: { type: "object", properties: { native: { type: "string" }, transliteration: { type: "string" }, english: { type: "string" } } }
      });

      await base44.entities.Word.create({
        word: result.native || word,
        translation: result.english || word,
        phonetic: result.transliteration || result.native || word,
        category: "wordbank",
        language: lang,
        vocab_level: 0,
        times_practiced: 0,
        mastered: false,
      });

      removeWord(idx);
      toast.success(`"${word}" added to backpack! 🎒`);
    } catch (e) {
      toast.error("Failed to save word");
    }
    setSaving(null);
  };

  const saveAll = async () => {
    for (let i = 0; i < pending.length; i++) {
      await saveToBackpack(pending[0], 0);
    }
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl bg-cyan-400 text-slate-900 shadow-lg font-bold flex items-center gap-1.5"
        >
          🎒 {pending.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">{pending.length}</span>}
          Backpack
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-50 w-72 shadow-2xl rounded-2xl overflow-hidden bg-slate-950/95 backdrop-blur-xl border border-cyan-500/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/20 border-b border-cyan-500/20">
              <span className="font-bold text-cyan-300 text-sm">🎒 Quick Add to Backpack</span>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input */}
            <div className="p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWord()}
                placeholder="Type a word..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm outline-none placeholder:text-white/30 focus:border-cyan-400/60"
                autoFocus
              />
              <button
                onClick={addWord}
                disabled={!input.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Word List */}
            <div className="max-h-52 overflow-y-auto px-3 pb-2 space-y-1.5">
              {pending.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">Add words to save as flashcards</p>
              )}
              {pending.map((word, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
                  <span className="text-white text-sm flex-1">{word}</span>
                  <button
                    onClick={() => saveToBackpack(word, idx)}
                    disabled={saving === idx}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                    title="Save as flashcard"
                  >
                    {saving === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </button>
                  <button onClick={() => removeWord(idx)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Save All */}
            {pending.length > 1 && (
              <div className="px-3 pb-3">
                <button
                  onClick={saveAll}
                  disabled={saving !== null}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg py-1.5 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  Save All ({pending.length}) to Backpack
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}