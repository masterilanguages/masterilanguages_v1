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
    if (canEdit) {
      setEditingWord(idx);
      setEditValue(wordObj.text);
      setClickedWord(null);
      return;
    }

    setClickedWord(idx);
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
    if (editValue.trim() && editValue !== wordObj.text) {
      const segment = transcript[wordObj.segmentIndex];
      const words = segment.transliteration.split(/\s+/);
      words[wordObj.wordIndex] = editValue.trim();
      const newTransliteration = words.join(' ');
      
      if (onEditWord) {
        onEditWord(wordObj.segmentIndex, 'transliteration', newTransliteration);
      }
    }
    setEditingWord(null);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white/5 rounded-2xl p-8">
      <p className="text-2xl leading-relaxed text-center" style={{ lineHeight: '2.5' }}>
        {allWords.map((wordObj, idx) => {
          const isActive = currentTime >= wordObj.start && 
                          currentTime < (allWords[idx + 1]?.start || Infinity);
          
          if (editingWord === idx) {
            return (
              <span key={idx} className="relative inline-block">
                <span className="inline-flex items-center gap-1">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddWord(wordObj.text);
                    }}
                    className="text-xl hover:scale-110 transition-transform"
                  >
                    🎒
                  </button>
                </span>
                <span> </span>
              </span>
            );
          }
          
          return (
            <span key={idx} className="relative inline-block">
              <motion.span
                onClick={(e) => {
                  if (!canEdit) {
                    if (lastSeekIdx === idx) {
                      onSeekTo(wordObj.start, true); // play
                    } else {
                      onSeekTo(wordObj.start, false); // pause
                      setLastSeekIdx(idx);
                    }
                  } else {
                    handleWordClick(wordObj, idx, e);
                  }
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
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 10 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/20 rounded-lg px-3 py-2 shadow-lg z-50 whitespace-nowrap flex items-center gap-2"
                  >
                    {isTranslating ? (
                      <p className="text-white/60 text-sm">...</p>
                    ) : (
                      <>
                        <p className="text-white text-sm">{translation}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddWord(wordObj.text);
                            setClickedWord(null);
                          }}
                          className="text-xl hover:scale-110 transition-transform"
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
        })}
      </p>
    </div>
  );
}