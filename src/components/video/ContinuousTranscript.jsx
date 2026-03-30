import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Play } from "lucide-react";

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
  const [editingTranslation, setEditingTranslation] = useState(false);
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

  // Group words into 5-second chunks
  const timeChunks = [];
  let currentChunk = { time: 0, words: [] };
  
  allWords.forEach((wordObj, idx) => {
    const chunkTime = Math.floor(wordObj.start / 5) * 5;
    
    if (chunkTime !== currentChunk.time && currentChunk.words.length > 0) {
      timeChunks.push(currentChunk);
      currentChunk = { time: chunkTime, words: [] };
    }
    
    currentChunk.time = chunkTime;
    currentChunk.words.push({ ...wordObj, globalIdx: idx });
  });
  
  if (currentChunk.words.length > 0) {
    timeChunks.push(currentChunk);
  }

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
    setEditingTranslation(false);
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

  const saveChunkTimestamp = (chunkTime) => {
    const newTime = parseFloat(timestampValue);
    if (isNaN(newTime) || newTime < 0) {
      setEditingTimestamp(null);
      return;
    }
    
    // Find the first word in this chunk
    const firstWord = allWords.find(w => Math.floor(w.start / 5) * 5 === chunkTime);
    if (!firstWord) {
      setEditingTimestamp(null);
      return;
    }
    
    const segment = transcript[firstWord.segmentIndex];
    const words = segment.transliteration.split(/\s+/).filter(w => w.trim());
    const wordDuration = (transcript[firstWord.segmentIndex + 1]?.start || (segment.start + 10)) - segment.start;
    
    // Adjust segment start to place first word at new time
    const adjustedSegmentStart = newTime - (firstWord.wordIndex * (wordDuration / words.length));
    
    if (onEditWord) {
      onEditWord(firstWord.segmentIndex, 'start', adjustedSegmentStart);
    }
    
    setEditingTimestamp(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto bg-white/5 rounded-2xl p-6">
      <div className="space-y-3">
        {timeChunks.map((chunk, chunkIdx) => {
          const isChunkActive = currentTime >= chunk.time && currentTime < (timeChunks[chunkIdx + 1]?.time || Infinity);
          
          return (
            <div key={chunk.time} className="flex gap-3 items-start">
              {/* Timestamp Play Button */}
              <div className="flex-shrink-0 pt-1">
                {editingTimestamp === chunk.time ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={timestampValue}
                      onChange={(e) => setTimestampValue(e.target.value)}
                      onBlur={() => saveChunkTimestamp(chunk.time)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveChunkTimestamp(chunk.time);
                        if (e.key === 'Escape') setEditingTimestamp(null);
                      }}
                      className="w-16 h-7 bg-white/10 border-white/20 text-white text-xs px-1.5"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onSeekTo(chunk.time, false)}
                    onDoubleClick={() => {
                      setEditingTimestamp(chunk.time);
                      setTimestampValue(chunk.time.toFixed(1));
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs font-mono ${
                      isChunkActive 
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {formatTime(chunk.time)}
                  </button>
                )}
              </div>

              {/* Words */}
              <div className="flex-1 text-lg leading-relaxed" style={{ lineHeight: '1.8' }}>
                {chunk.words.map((wordObj) => {
                  const idx = wordObj.globalIdx;
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
                                  {editingTranslation ? (
                                    <input
                                      autoFocus
                                      value={translation}
                                      onChange={(e) => setTranslation(e.target.value)}
                                      onBlur={() => setEditingTranslation(false)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTranslation(false); }}
                                      className="text-white text-xs bg-white/10 border border-white/30 rounded px-1 py-0.5 w-28 outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <p
                                      className="text-white text-xs font-medium cursor-pointer hover:text-cyan-300 underline underline-offset-2"
                                      title="Click to edit translation"
                                      onClick={(e) => { e.stopPropagation(); setEditingTranslation(true); }}
                                    >
                                      {translation}
                                    </p>
                                  )}
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
                                 {editingTranslation ? (
                                   <input
                                     autoFocus
                                     value={translation}
                                     onChange={(e) => setTranslation(e.target.value)}
                                     onBlur={() => setEditingTranslation(false)}
                                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTranslation(false); }}
                                     className="text-white text-xs bg-white/10 border border-white/30 rounded px-1 py-0.5 w-28 outline-none"
                                     onClick={(e) => e.stopPropagation()}
                                   />
                                 ) : (
                                   <p
                                     className="text-white text-xs font-medium cursor-pointer hover:text-cyan-300 underline underline-offset-2"
                                     title="Click to edit translation"
                                     onClick={(e) => { e.stopPropagation(); setEditingTranslation(true); }}
                                   >
                                     {translation}
                                   </p>
                                 )}
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
                      </AnimatePresence>
                      <span> </span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}