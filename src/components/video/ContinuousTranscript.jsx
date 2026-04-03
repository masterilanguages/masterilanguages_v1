import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Loader2, Check, X, Plus, Trash2 } from "lucide-react";

export default function ContinuousTranscript({ 
  transcript, 
  currentTime, 
  onSeekTo, 
  onAddWord,
  onEditWord,
  canEdit
}) {
  const [playingSegment, setPlayingSegment] = useState(null);
  const [editingSegmentTime, setEditingSegmentTime] = useState(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");

  // Word editing state
  const [editingCell, setEditingCell] = useState(null); // { segIdx, field, wordIdx }
  const [editCellValue, setEditCellValue] = useState("");
  const [savingCell, setSavingCell] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sort transcript by start time for correct active highlighting
  const sortedByTime = [...transcript].sort((a, b) => (a.start || 0) - (b.start || 0));

  const getWordsArray = (text) => (text || "").split(/\s+/).filter(w => w.trim());

  const startEditWord = (segIdx, field, wordIdx, currentWords) => {
    setEditingCell({ segIdx, field, wordIdx });
    setEditCellValue(currentWords[wordIdx] || "");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditCellValue("");
  };

  const saveWordEdit = async (segIdx, field, wordIdx, newValue) => {
    const segment = transcript[segIdx];
    const words = getWordsArray(segment[field]);
    const trimmed = newValue.trim();

    let changed = false;
    if (!trimmed) {
      // Delete
      words.splice(wordIdx, 1);
      changed = true;
    } else if (trimmed !== words[wordIdx]) {
      words[wordIdx] = trimmed;
      changed = true;
    }

    if (!changed) {
      cancelEdit();
      return;
    }

    const newFieldText = words.join(' ');
    setSavingCell(true);

    // Update the edited field first
    if (onEditWord) onEditWord(segIdx, field, newFieldText);

    // Only re-translate the OTHER fields based on what changed
    try {
      if (field === 'transliteration') {
        // Re-fetch hebrew and english from new transliteration
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Given this Hebrew transliteration line: "${newFieldText}"
Convert ONLY the changed/new words to Hebrew with nikud, keeping existing Hebrew words for unchanged parts where possible.
Also provide an English translation of the full line.

Return JSON with:
- hebrew: full Hebrew line with nikud (same word count and order as transliteration)
- english: English translation of the full line`,
          response_json_schema: {
            type: "object",
            properties: {
              hebrew: { type: "string" },
              english: { type: "string" }
            }
          }
        });
        if (onEditWord) {
          if (result.hebrew) onEditWord(segIdx, 'hebrew', result.hebrew);
          if (result.english) onEditWord(segIdx, 'english', result.english);
        }
      } else if (field === 'hebrew') {
        // Re-fetch transliteration and english from new hebrew
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Given this Hebrew text with nikud: "${newFieldText}"
Provide:
- transliteration: Latin phonetic transliteration of the full line
- english: English translation of the full line`,
          response_json_schema: {
            type: "object",
            properties: {
              transliteration: { type: "string" },
              english: { type: "string" }
            }
          }
        });
        if (onEditWord) {
          if (result.transliteration) onEditWord(segIdx, 'transliteration', result.transliteration);
          if (result.english) onEditWord(segIdx, 'english', result.english);
        }
      } else if (field === 'english') {
        // English changed — no need to re-translate other fields
      }
    } catch (e) {
      console.error('Re-translation failed', e);
    }

    setSavingCell(false);
    cancelEdit();
  };

  const addWordToSegment = async (segIdx, field, afterIdx) => {
    const segment = transcript[segIdx];
    const words = getWordsArray(segment[field]);
    const newWord = "___";
    words.splice(afterIdx + 1, 0, newWord);
    if (onEditWord) onEditWord(segIdx, field, words.join(' '));
    // Start editing the new word
    setEditingCell({ segIdx, field, wordIdx: afterIdx + 1 });
    setEditCellValue("");
  };

  const renderEditableWords = (segIdx, field, text, textClassName) => {
    const words = getWordsArray(text);
    return (
      <span className="inline-flex flex-wrap gap-x-1 gap-y-0.5 items-center">
        {words.map((word, wordIdx) => {
          const isEditing = editingCell?.segIdx === segIdx && editingCell?.field === field && editingCell?.wordIdx === wordIdx;
          if (isEditing) {
            return (
              <span key={wordIdx} className="inline-flex items-center gap-0.5">
                <input
                  autoFocus
                  value={editCellValue}
                  onChange={e => setEditCellValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveWordEdit(segIdx, field, wordIdx, editCellValue);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="bg-yellow-400/20 border border-yellow-400 text-yellow-200 rounded px-1 text-sm outline-none"
                  style={{ width: `${Math.max(editCellValue.length * 9 + 16, 40)}px` }}
                  placeholder="type or leave empty to delete"
                />
                <button onClick={() => saveWordEdit(segIdx, field, wordIdx, editCellValue)} className="text-green-400 hover:text-green-300 p-0.5">
                  {savingCell ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
                <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          }
          return (
            <span key={wordIdx} className="inline-flex items-center group/word">
              <span
                onClick={() => canEdit && startEditWord(segIdx, field, wordIdx, words)}
                className={`${textClassName} ${canEdit ? 'cursor-pointer hover:bg-white/10 rounded px-0.5 transition-colors' : ''}`}
              >
                {word}
              </span>
              {canEdit && (
                <button
                  onClick={() => addWordToSegment(segIdx, field, wordIdx)}
                  className="opacity-0 group-hover/word:opacity-100 transition-opacity ml-0.5 text-white/30 hover:text-cyan-400"
                  title="Add word after"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="w-full bg-white/5 rounded-2xl p-4">
      {canEdit && (
        <p className="text-white/30 text-xs text-center mb-3">Click any word to edit • Leave empty to delete • + to add after</p>
      )}
      <div className="space-y-4 flex flex-col items-center">
        {transcript.map((segment, segIdx) => {
          if (!segment.transliteration) return null;
          const sortedIdx = sortedByTime.findIndex(s => s === segment);
          const nextSegment = sortedByTime[sortedIdx + 1];
          const isActive = currentTime >= segment.start &&
            currentTime < (nextSegment?.start ?? Infinity);

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
                        if (!isNaN(secs)) {
                          if (onEditWord) onEditWord(segIdx, 'start', secs);
                          onSeekTo(secs, false);
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
                        onSeekTo(currentTime, false);
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
                  {renderEditableWords(segIdx, 'transliteration', segment.transliteration, 'text-white text-base font-medium')}
                </p>
                {/* Translation */}
                {segment.english && (
                  <p className="text-white/60 text-sm leading-snug text-left">
                    {renderEditableWords(segIdx, 'english', segment.english, 'text-white/60 text-sm')}
                  </p>
                )}
                {/* Hebrew with nikud */}
                {segment.hebrew && (
                  <p className="text-cyan-300 text-base leading-snug text-left" dir="ltr" style={{ unicodeBidi: 'plaintext' }}>
                    {renderEditableWords(segIdx, 'hebrew', segment.hebrew, 'text-cyan-300 text-base')}
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