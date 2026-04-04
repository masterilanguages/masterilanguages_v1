import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, StickyNote as StickyNoteIcon } from "lucide-react";

export default function StickyNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem("sticky_notes") || "");

  const handleChange = (e) => {
    setNotes(e.target.value);
    localStorage.setItem("sticky_notes", e.target.value);
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
            className="fixed bottom-20 left-4 z-50 w-72 shadow-2xl rounded-2xl overflow-hidden"
            style={{ background: "#fef08a", border: "1px solid #eab308" }}
          >
            <div className="flex items-center justify-between px-3 py-2" style={{ background: "#fde047" }}>
              <div className="flex items-center gap-1.5">
                <StickyNoteIcon className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-700 text-sm">Notes</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={handleChange}
              placeholder="Take notes while watching..."
              className="w-full h-52 p-3 text-sm text-slate-800 resize-none outline-none"
              style={{ background: "transparent" }}
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}