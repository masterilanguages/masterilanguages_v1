import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, StickyNote as StickyNoteIcon, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// Extract @Name mentions from text
function parseMentions(text) {
  const regex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)/g;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[1].trim());
  }
  return [...new Set(matches)];
}

// Extract standalone words (not @mentions) for backpack
function extractWords(text) {
  const clean = text.replace(/@[A-Za-z]+(?:\s+[A-Za-z]+)*/g, "");
  return clean.split(/[\s,;.!?()[\]{}"']+/).map(w => w.trim()).filter(w => w.length > 1);
}

export default function StickyNote() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem("sticky_notes") || "");
  const [saving, setSaving] = useState(false);
  const [addingToBackpack, setAddingToBackpack] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // string after @ currently being typed
  const textareaRef = useRef(null);

  // Load all users for @mention autocomplete (admin-only: list-users is admin-gated)
  useEffect(() => {
    base44.auth.me()
      .then(me => {
        if (me?.role !== 'admin') return;
        return base44.entities.User.list().then(users => setAllUsers(users));
      })
      .catch(() => {});
  }, []);

  const mentions = parseMentions(notes);
  const words = extractWords(notes);

  const handleChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem("sticky_notes", val);

    // Detect if user is currently typing an @mention
    const cursorPos = e.target.selectionStart;
    const textUpToCursor = val.slice(0, cursorPos);
    const atMatch = textUpToCursor.match(/@([A-Za-z\s]*)$/);

    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      setMentionQuery(query);
      const filtered = allUsers.filter(u =>
        (u.full_name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const insertMention = (user) => {
    const cursorPos = textareaRef.current?.selectionStart || notes.length;
    const textUpToCursor = notes.slice(0, cursorPos);
    const afterCursor = notes.slice(cursorPos);
    // Replace the partial @... with the full name
    const replaced = textUpToCursor.replace(/@([A-Za-z\s]*)$/, `@${user.full_name || user.email} `);
    const newVal = replaced + afterCursor;
    setNotes(newVal);
    localStorage.setItem("sticky_notes", newVal);
    setSuggestions([]);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleAddToMyBackpack = async () => {
    if (words.length === 0) {
      toast.error("No words found in note");
      return;
    }
    setAddingToBackpack(true);
    try {
      const existing = await base44.entities.Word.filter({ category: "wordbank" });
      const existingPhonetics = new Set(existing.map(w => (w.phonetic || w.word || "").toLowerCase()));

      const newWordsList = words
        .filter(w => !existingPhonetics.has(w.toLowerCase()))
        .map(word => ({ word, meaning: "", hebrew: "" }));

      // Store in localStorage so Backpack page picks them up
      const prev = JSON.parse(localStorage.getItem('pendingBackpackWords') || '[]');
      localStorage.setItem('pendingBackpackWords', JSON.stringify([...prev, ...newWordsList]));

      toast.success(`${newWordsList.length} word(s) added! Opening backpack...`);
      setIsOpen(false);
      navigate(createPageUrl('Backpack'));
    } catch (e) {
      toast.error("Failed to add words");
    }
    setAddingToBackpack(false);
  };

  const handleSave = async () => {
    if (!notes.trim()) return;
    if (mentions.length === 0) {
      toast.error("Add @Name to tag a student");
      return;
    }

    setSaving(true);
    try {
      const currentUser = await base44.auth.me();

      for (const mention of mentions) {
        const nameLower = mention.toLowerCase();
        const matchedUser = allUsers.find(u =>
          (u.full_name || "").toLowerCase() === nameLower
        );

        await base44.entities.CoachNote.create({
          student_name: mention,
          student_email: matchedUser?.email || "",
          coach_email: currentUser.email,
          note: notes,
          words: words,
        });

        if (matchedUser?.email && words.length > 0) {
          try {
            const result = await base44.functions.invoke('addWordsToStudentBackpack', {
              student_email: matchedUser.email,
              words,
            });
            toast.success(`Note saved + ${result.data?.added || 0} word(s) added to @${mention}'s backpack!`);
          } catch {
            toast.success(`Note saved for @${mention}`);
          }
        } else {
          toast.success(`Note saved for @${mention}`);
        }
      }

      setNotes("");
      localStorage.setItem("sticky_notes", "");
    } catch (e) {
      toast.error("Failed to save note");
    }
    setSaving(false);
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-40 z-50 px-4 py-2 rounded-xl bg-yellow-300 text-slate-900 shadow-lg font-bold flex items-center gap-1.5"
        >
          <StickyNoteIcon className="w-4 h-4" />
          Notes
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-50 w-80 shadow-2xl rounded-2xl overflow-hidden"
            style={{ background: "#fef08a", border: "1px solid #eab308" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2" style={{ background: "#fde047" }}>
              <div className="flex items-center gap-1.5">
                <StickyNoteIcon className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-700 text-sm">Notes</span>
                <span className="text-slate-500 text-xs ml-1">@ to tag someone</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={handleChange}
                placeholder={"Take notes...\n\n@John Smith - practice: shalom, toda"}
                className="w-full h-44 p-3 text-sm text-slate-800 resize-none outline-none"
                style={{ background: "transparent" }}
                autoFocus
              />

              {/* @mention autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute left-3 right-3 bg-white rounded-xl shadow-lg border border-yellow-300 z-10 overflow-hidden">
                  {suggestions.map(user => (
                    <button
                      key={user.id}
                      onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                      className="w-full text-left px-3 py-2 hover:bg-yellow-50 text-sm text-slate-800 flex items-center gap-2 border-b border-yellow-100 last:border-0"
                    >
                      <span className="font-medium">{user.full_name || user.email}</span>
                      {user.full_name && <span className="text-slate-400 text-xs">{user.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detected mentions */}
            {mentions.length > 0 && (
              <div className="px-3 pb-1 flex flex-wrap gap-1">
                {mentions.map(m => (
                  <span key={m} className="bg-amber-400/50 text-slate-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    @{m}
                  </span>
                ))}
              </div>
            )}

            {/* Bottom action row */}
            <div className="px-3 pb-3 pt-1 flex gap-2">
              {/* Backpack button — always shown when there are words */}
              {words.length > 0 && (
                <button
                  onClick={handleAddToMyBackpack}
                  disabled={addingToBackpack}
                  title="Add words to my backpack"
                  className="flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold text-sm rounded-lg py-2 px-3 transition-all disabled:opacity-60 flex-shrink-0"
                >
                  {addingToBackpack ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base">🎒</span>}
                </button>
              )}

              {/* Save to student button — only when @mention present */}
              {mentions.length > 0 && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg py-2 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Save for {mentions.map(m => `@${m}`).join(", ")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}