import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";

export default function ContinuousTranscript({ 
  transcript, 
  currentTime, 
  onSeekTo, 
  onAddWord,
  onEditWord,
  canEdit
}) {
  const [clickedWord, setClickedWord] = useState(null);
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [lastSeekIdx, setLastSeekIdx] = useState(null);
  const [editingTimestamp, setEditingTimestamp] = useState(null);
  const [timestampValue, setTimestampValue] = useState("");

  // Flatten all words from all segments with their timestamps
  const allWords = transcript.flatMap((segment, segIdx) => {
    if (!segment.transliteration) return [];
    
    const words = segment.transliteration.split(/\s+/).filter(w => w.trim());
    const nextStart = transcript[segIdx + 1]?.start || Infinity;
    const segmentDuration = nextStart - segment.start;
    const wordDuration = segmentDuration / words.length;
    
    return words.map((word, wordIdx) => ({
      text: word,
      start: segment.start + (wordIdx * wordDuration),
      segmentIndex: segIdx,
      wordIndex: wordIdx
    }));
  });

  const handleWordClick = async (wordObj, idx, e) => {
    // Seek and play/pause behavior
    if (lastSeekIdx === idx && clickedWord === idx) {
      onSeekTo(wordObj.start, true); // play
      setLastSeekIdx(null);
      setClickedWord(null);
      return;
    } else {
      onSeekTo(wordObj.start, false); // pause
      setLastSeekIdx(idx);
    }

    // Show translation and edit field
    setClickedWord(idx);
    setEditValue(wordObj.text);
    setIsTranslating(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this Hebrew word to English: "${wordObj.text}". Return only the English translation, nothing else.`
      });
      setTranslation(result);
    } catch (e) {
      setTranslation("Translation failed");
    }
    
    setIsTranslating(false);
  };

  const saveEdit = (wordObj) => {
    const segment = transcript[wordObj.segmentIndex];
    const words = segment.transliteration.split(/\s+/);
    
    if (!editValue.trim()) {
      // Delete the word if empty
      words.splice(wordObj.wordIndex, 1);
    } else if (editValue !== wordObj.text) {
      // Update the word
      words[wordObj.wordIndex] = editValue.trim();
    }
    
    const newTransliteration = words.join(' ');
    
    if (onEditWord) {
      onEditWord(wordObj.segmentIndex, 'transliteration', newTransliteration);
    }
    
    setEditingWord(null);
  };

  const saveTimestamp = (wordObj) => {
    const newTime = parseFloat(timestampValue);
    if (isNaN(newTime) || newTime < 0) return;
    
    const segment = transcript[wordObj.segmentIndex];
    const updatedSegment = { ...segment, start: newTime };
    
    // Update the transcript array
    const updatedTranscript = [...transcript];
    updatedTranscript[wordObj.segmentIndex] = updatedSegment;
    
    if (onEditWord) {
      onEditWord(wordObj.segmentIndex, 'start', newTime);
    }
    
    setEditingTimestamp(null);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white/5 rounded-2xl p-6">
      <p className="text-lg leading-relaxed text-center" style={{ lineHeight: '1.8' }}>
        {allWords.map((wordObj, idx) => {
          const isActive = currentTime >= wordObj.start && 
                          currentTime < (allWords[idx + 1]?.start || Infinity);
          
          if (editingWord === idx) {
          return (
          <span key={idx} className="relative inline-block">
          <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(wordObj)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit(wordObj);
            if (e.key === 'Escape') setEditingWord(null);
          }}
          className="inline-block w-24 h-8 bg-cyan-500/20 border-cyan-400 text-white text-base"
          autoFocus
          />
          <AnimatePresence>
          {clickedWord === idx && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 rounded-md px-2 py-1 shadow-lg z-50 flex items-center gap-1.5"
            >
              {isTranslating ? (
                <p className="text-white/60 text-xs">...</p>
              ) : (
                <>
                  <p className="text-white text-xs font-medium">{translation}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddWord(wordObj.text);
                    }}
                    className="text-base hover:scale-110 transition-transform"
                  >
                    🎒
                  </button>
                </>
              )}
            </motion.div>
          )}
          </AnimatePresence>
          <span> </span>
          </span>
          );
          }

          return (
            <span key={idx} className="relative inline-block">
              <motion.span
                onClick={(e) => handleWordClick(wordObj, idx, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingWord(idx);
                  setEditValue(wordObj.text);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditingTimestamp(idx);
                  setTimestampValue(wordObj.start.toFixed(2));
                }}
                animate={{
                  color: isActive ? '#22d3ee' : '#ffffff',
                  backgroundColor: isActive ? 'rgba(34, 211, 238, 0.2)' : 'transparent',
                  scale: isActive ? 1.1 : 1
                }}
                className="cursor-pointer hover:text-cyan-300 transition-all px-1 rounded"
                style={{ display: 'inline-block' }}
              >
                {wordObj.text}
              </motion.span>

              <AnimatePresence>
              {clickedWord === idx && (
              <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 rounded-md px-2 py-1 shadow-lg z-50 flex items-center gap-1.5"
              >
              {isTranslating ? (
                <p className="text-white/60 text-xs">...</p>
              ) : (
                <>
                  <p className="text-white text-xs font-medium">{translation}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddWord(wordObj.text);
                      setClickedWord(null);
                    }}
                    className="text-base hover:scale-110 transition-transform"
                  >
                    🎒
                  </button>
                </>
              )}
              </motion.div>
              )}
              {editingTimestamp === idx && (
              <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/95 rounded-md px-2 py-1 shadow-lg z-50 flex items-center gap-1.5"
              >
              <Input
                type="number"
                step="0.1"
                value={timestampValue}
                onChange={(e) => setTimestampValue(e.target.value)}
                onBlur={() => saveTimestamp(wordObj)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTimestamp(wordObj);
                  if (e.key === 'Escape') setEditingTimestamp(null);
                }}
                className="w-20 h-6 bg-white/10 border-white/20 text-white text-xs px-1.5"
                autoFocus
              />
              <span className="text-white/60 text-xs">sec</span>
              </motion.div>
              )}
              </AnimatePresence>
              <span> </span>
              </span>
              );
        })}
      </p>
    </div>
  );
}