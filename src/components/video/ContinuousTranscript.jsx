import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function ContinuousTranscript({ 
  transcript, 
  currentTime, 
  onSeekTo, 
  onAddWord 
}) {
  const [clickedWord, setClickedWord] = useState(null);
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

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
      segmentIndex: segIdx
    }));
  });

  const handleWordClick = async (wordObj, idx) => {
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

  return (
    <div className="max-w-4xl mx-auto bg-white/5 rounded-2xl p-8">
      <p className="text-2xl leading-relaxed text-center" style={{ lineHeight: '2.5' }}>
        {allWords.map((wordObj, idx) => {
          const isActive = currentTime >= wordObj.start && 
                          currentTime < (allWords[idx + 1]?.start || Infinity);
          
          return (
            <span key={idx} className="relative inline-block">
              <motion.span
                onClick={() => handleWordClick(wordObj, idx)}
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
                    className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/20 rounded-lg px-3 py-2 shadow-lg z-50 whitespace-nowrap min-w-[120px]"
                  >
                    {isTranslating ? (
                      <p className="text-white/60 text-sm">...</p>
                    ) : (
                      <>
                        <p className="text-white text-sm mb-2">{translation}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddWord(wordObj.text);
                            setClickedWord(null);
                          }}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded px-2 py-1 text-xs text-white"
                        >
                          🎒 Add to Backpack
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