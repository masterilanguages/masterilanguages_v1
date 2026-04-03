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
  const [playingSegment, setPlayingSegment] = useState(null);
  const [editingSegmentTime, setEditingSegmentTime] = useState(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");

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
    <div className="w-full bg-white/5 rounded-2xl p-4">
      <div className="space-y-4 flex flex-col items-center">
        {transcript.map((segment, segIdx) => {
          if (!segment.transliteration) return null;
          const isActive = currentTime >= segment.start &&
            currentTime < (transcript[segIdx + 1]?.start || Infinity);

          return (
            <div key={segIdx} className={`flex gap-3 items-start rounded-xl px-3 py-2 transition-all w-full max-w-lg ${isActive ? 'bg-cyan-500/10 border border-cyan-400/30' : 'border border-transparent'}`}>
              {/* Timestamp Play Button */}
              <div className="flex-shrink-0 pt-1">
                {editingSegmentTime === segIdx ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingTimeValue}
                    onChange={(e) => setEditingTimeValue(e.target.value)}
                    onBlur={() => {
                      const parts = editingTimeValue.split(':');
                      if (parts.length === 2) {
                        const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        if (!isNaN(secs) && onEditWord) {
                          onEditWord(segIdx, 'start', secs);
                        }
                      }
                      setEditingSegmentTime(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setEditingSegmentTime(null);
                    }}
                    className="w-16 px-2 py-1 rounded-lg text-xs font-mono bg-yellow-400/20 border border-yellow-400 text-yellow-300 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      if (playingSegment === segIdx) {
                        onSeekTo(segment.start, false);
                        setPlayingSegment(null);
                      } else {
                        onSeekTo(segment.start, true);
                        setPlayingSegment(segIdx);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setEditingSegmentTime(segIdx);
                      setEditingTimeValue(formatTime(segment.start));
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs font-mono ${
                      isActive
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {formatTime(segment.start)}
                  </button>
                )}
              </div>

              {/* Text Block */}
              <div className="flex-1 space-y-0.5">
                {/* Transliteration */}
                <p className="text-white text-base font-medium leading-snug text-left">
                  {segment.transliteration}
                </p>
                {/* Translation */}
                {segment.english && (
                  <p className="text-white/60 text-sm leading-snug text-left">
                    {segment.english}
                  </p>
                )}
                {/* Hebrew with nikud - display left-aligned, preserving word order */}
                {segment.hebrew && (
                  <p className="text-cyan-300 text-base leading-snug text-left" dir="ltr" style={{ unicodeBidi: 'plaintext' }}>
                    {segment.hebrew}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}