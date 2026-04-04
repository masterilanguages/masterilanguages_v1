import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, StickyNote as StickyNoteIcon, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Extract @Name mentions from text (single or multi word)
function parseMentions(text) {
  const regex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)/g;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[1].trim());
  }
  return [...new Set(matches)];
}

// Extract standalone words (Hebrew or English, not @mentions) for backpack
function extractWords(text) {
  // Remove @mentions
  const clean = text.replace(/@[A-Za-z]+(?:\s+[A-Za-z]+)*/g, "");
  // Split by whitespace/punctuation, keep Hebrew and Latin words
  return clean.split(/[\s,;.!?()[\]{}"']+/).map(w => w.trim()).filter(w => w.length > 1);
}

export default function StickyNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem("sticky_notes") || "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const handleChange = (e) => {
    setNotes(e.target.value);
    localStorage.setItem("sticky_notes", e.target.value);
  };

  // Highlight @mentions in textarea via a visual overlay isn't easy,
  // so we show a preview of detected mentions below the textarea.
  const mentions = parseMentions(notes);

  const handleSave = async () => {
    if (!notes.trim()) return;
    if (mentions.length === 0) {
      toast.error("Add @FirstName LastName to tag a student");
      return;
    }

    setSaving(true);
    try {
      const currentUser = await base44.auth.me();

      // Fetch all users to try to match names
      let allUsers = [];
      try { allUsers = await base44.entities.User.list(); } catch {}

      const words = extractWords(notes);

      for (const mention of mentions) {
        // Try to match full name to a user
        const nameLower = mention.toLowerCase();
        const matchedUser = allUsers.find(u =>
          (u.full_name || "").toLowerCase() === nameLower
        );

        // Save CoachNote
        await base44.entities.CoachNote.create({
          student_name: mention,
          student_email: matchedUser?.email || "",
          coach_email: currentUser.email,
          note: notes,
          words: words,
        });

        toast.success(`Note saved for @${mention}`);
      }

      // Clear note after saving
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
          className="fixed bottom-4 left-28 z-50 px-4 py-2 rounded-xl bg-yellow-300 text-slate-900 shadow-lg font-bold flex items-center gap-1.5"
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
                <span className="text-slate-500 text-xs ml-1">use @FirstName LastName to tag</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={notes}
              onChange={handleChange}
              placeholder={"Take notes...\n\n@John Smith - practice these words: shalom, toda"}
              className="w-full h-44 p-3 text-sm text-slate-800 resize-none outline-none"
              style={{ background: "transparent" }}
              autoFocus
            />

            {/* Detected mentions preview */}
            {mentions.length > 0 && (
              <div className="px-3 pb-1 flex flex-wrap gap-1">
                {mentions.map(m => (
                  <span key={m} className="bg-amber-400/50 text-slate-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    @{m}
                  </span>
                ))}
              </div>
            )}

            {/* Save button */}
            {mentions.length > 0 && (
              <div className="px-3 pb-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg py-2 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Save note & words for {mentions.map(m => `@${m}`).join(", ")}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}