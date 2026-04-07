import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Pause, Loader2, Check, X, Plus } from "lucide-react";

export default function ContinuousTranscript({ 
  transcript: transcriptProp, 
  currentTime, 
  onSeekTo, 
  onAddWord,
  onEditWord,
  onDeleteSegment,
  canEdit
}) {
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [localTranscript, setLocalTranscript] = useState(transcriptProp);

  // Sync when prop changes (e.g. loaded from DB)
  React.useEffect(() => {
    setLocalTranscript(transcriptProp);
  }, [transcriptProp]);

  const transcript = localTranscript;

  const applyLocalEdit = (segIdx, field, value) => {
    setLocalTranscript(prev => prev.map((seg, i) => i === segIdx ? { ...seg, [field]: value } : seg));
  };

  const [editingSegmentTime, setEditingSegmentTime] = useState(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");
  const [wasPlayingBeforeEdit, setWasPlayingBeforeEdit] = useState(false);

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

    // Update locally immediately
    applyLocalEdit(segIdx, field, newFieldText);
    cancelEdit();

    // Persist to DB
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
          if (result.hebrew) { applyLocalEdit(segIdx, 'hebrew', result.hebrew); onEditWord(segIdx, 'hebrew', result.hebrew); }
          if (result.english) { applyLocalEdit(segIdx, 'english', result.english); onEditWord(segIdx, 'english', result.english); }
        }
      } else if (field === 'hebrew') {
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
          if (result.transliteration) { applyLocalEdit(segIdx, 'transliteration', result.transliteration); onEditWord(segIdx, 'transliteration', result.transliteration); }
          if (result.english) { applyLocalEdit(segIdx, 'english', result.english); onEditWord(segIdx, 'english', result.english); }
        }
      }
    } catch (e) {
      console.error('Re-translation failed', e);
    }

    setSavingCell(false);
  };

  const deleteSegment = (segIdx) => {
    setLocalTranscript(prev => prev.filter((_, i) => i !== segIdx));
    if (onDeleteSegment) onDeleteSegment(segIdx);
    setEditingSegmentTime(null);
  };

  const addWordToSegment = async (segIdx, field, afterIdx) => {
    const segment = transcript[segIdx];
    const words = getWordsArray(segment[field]);
    const newWord = "___";
    words.splice(afterIdx + 1, 0, newWord);
    const newText = words.join(' ');
    applyLocalEdit(segIdx, field, newText);
    if (onEditWord) onEditWord(segIdx, field, newText);
    // Start editing the new word
    setEditingCell({ segIdx, field, wordIdx: afterIdx + 1 });
    setEditCellValue("");
  };

  const renderEditableWords = (segIdx, field, text, textClassName) => {
    const words = getWordsArray(text);
    return (
      <span>
        {words.map((word, wordIdx) => {
          const isEditing = editingCell?.segIdx === segIdx && editingCell?.field === field && editingCell?.wordIdx === wordIdx;
          if (isEditing) {
            return (
              <span key={wordIdx} className="inline-flex items-center gap-0.5 mx-0.5">
                <input
                  autoFocus
                  value={editCellValue}
                  onChange={e => setEditCellValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveWordEdit(segIdx, field, wordIdx, editCellValue);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="bg-yellow-400/20 border border-yellow-400 text-yellow-200 rounded px-1 text-sm outline-none"
                  style={{ width: `${Math.max((editCellValue.length || 4) * 9 + 16, 50)}px` }}
                  placeholder="empty = delete"
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
            <span key={wordIdx} className="group/word inline-block">
              <span
                onClick={() => canEdit && startEditWord(segIdx, field, wordIdx, words)}
                className={`${textClassName} ${canEdit ? 'cursor-pointer hover:underline hover:opacity-80 transition-opacity' : ''}`}
              >
                {word}
              </span>
              {canEdit && (
                <button
                  onClick={() => addWordToSegment(segIdx, field, wordIdx)}
                  className="opacity-0 group-hover/word:opacity-60 transition-opacity mx-px text-white/40 hover:text-cyan-400 align-middle"
                  title="Add word after"
                >
                  <Plus className="w-2 h-2 inline" />
                </button>
              )}
              {wordIdx < words.length - 1 && ' '}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="w-full bg-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        {canEdit && (
          <p className="text-white/30 text-xs">Click any word to edit • Leave empty to delete • + to add after</p>
        )}
        <button
          onClick={() => setShowPhonetics(prev => !prev)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
            showPhonetics
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
          }`}
        >
          {showPhonetics ? '🔤 Show Transliteration' : 'אָ Show Phonetics'}
        </button>
      </div>
      <div className="space-y-1 flex flex-col items-center">
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
                  <span className="inline-flex items-center gap-0.5">
                    <input
                      autoFocus
                      type="text"
                      value={editingTimeValue}
                      onChange={(e) => setEditingTimeValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parts = editingTimeValue.split(':');
                          if (parts.length === 2) {
                            const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                            if (!isNaN(secs)) {
                              if (onEditWord) onEditWord(segIdx, 'start', secs);
                              onSeekTo(secs, wasPlayingBeforeEdit);
                            }
                          }
                          setEditingSegmentTime(null);
                        }
                        if (e.key === 'Escape') setEditingSegmentTime(null);
                      }}
                      className="w-14 px-1 py-0.5 rounded text-xs font-mono bg-yellow-400/20 border border-yellow-400 text-yellow-300 outline-none"
                    />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const parts = editingTimeValue.split(':');
                        if (parts.length === 2) {
                          const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                          if (!isNaN(secs)) {
                            if (onEditWord) onEditWord(segIdx, 'start', secs);
                            onSeekTo(secs, wasPlayingBeforeEdit);
                          }
                        }
                        setEditingSegmentTime(null);
                      }}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setEditingSegmentTime(null); }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {canEdit && (
                      <button
                        onMouseDown={(e) => { e.preventDefault(); deleteSegment(segIdx); }}
                        className="ml-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded border border-red-500/40 transition-all"
                        title="Delete this sentence"
                      >
                        🗑️
                      </button>
                    )}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (isActive) {
                        onSeekTo(segment.start, false); // pause
                      } else {
                        onSeekTo(segment.start, true); // seek and play
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      setWasPlayingBeforeEdit(isActive);
                      setEditingSegmentTime(segIdx);
                      setEditingTimeValue(formatTime(segment.start));
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs font-mono ${
                      isActive
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {formatTime(segment.start)}
                  </button>
                )}
              </div>

              {/* Text Block */}
              <div className="flex-1 space-y-0">
                {/* Main line: transliteration OR hebrew phonetics */}
                {showPhonetics ? (
                  segment.hebrew && (
                    <p className="text-cyan-300 text-base font-medium leading-tight text-left" dir="rtl">
                      {renderEditableWords(segIdx, 'hebrew', segment.hebrew, 'text-cyan-300 text-base font-medium')}
                    </p>
                  )
                ) : (
                  <p className="text-white text-base font-medium leading-tight text-left">
                    {renderEditableWords(segIdx, 'transliteration', segment.transliteration, 'text-white text-base font-medium')}
                  </p>
                )}
                {/* Translation */}
                {segment.english && (
                  <p className="text-white/60 text-sm leading-tight text-left">
                    {renderEditableWords(segIdx, 'english', segment.english, 'text-white/60 text-sm')}
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