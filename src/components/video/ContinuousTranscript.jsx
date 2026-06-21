import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Pause, Loader2, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ContinuousTranscript({ 
  transcript: transcriptProp, 
  currentTime, 
  onSeekTo, 
  onAddWord,
  onEditWord,
  onDeleteSegment,
  canEdit,
  isPlaying: isPlayingProp = false,
}) {
  const [showPhonetics, setShowPhonetics] = React.useState(true);
  const [hideEnglish, setHideEnglish] = React.useState(true);
  const [hideTranslit, setHideTranslit] = React.useState(false);
  const [localTranscript, setLocalTranscript] = React.useState(transcriptProp);

  // Sync when prop changes (e.g. loaded from DB)
  React.useEffect(() => {
    setLocalTranscript(transcriptProp);
  }, [transcriptProp]);

  const transcript = localTranscript;

  const applyLocalEdit = (segIdx, field, value) => {
    setLocalTranscript(prev => prev.map((seg, i) => i === segIdx ? { ...seg, [field]: value } : seg));
  };

  const [editingSegmentTime, setEditingSegmentTime] = React.useState(null);
  const [editingTimeValue, setEditingTimeValue] = React.useState("");
  const [wasPlayingBeforeEdit, setWasPlayingBeforeEdit] = React.useState(false);

  const [editingCell, setEditingCell] = React.useState(null);
  const [editingSegment, setEditingSegment] = React.useState(null); // segIdx
  const [editSegmentData, setEditSegmentData] = React.useState({});
  const [editCellValue, setEditCellValue] = React.useState("");
  const [savingCell, setSavingCell] = React.useState(false);
  const [activeWordKey, setActiveWordKey] = React.useState(null); // "segIdx-field-wordIdx"
  const [wordTranslations, setWordTranslations] = React.useState({}); // key -> translation string
  const [translatingKey, setTranslatingKey] = React.useState(null);
  const [revealedSentences, setRevealedSentences] = React.useState(new Set());

  const toggleSentenceReveal = (segIdx) => {
    setRevealedSentences(prev => {
      const next = new Set(prev);
      if (next.has(segIdx)) next.delete(segIdx); else next.add(segIdx);
      return next;
    });
  };

  const fetchWordTranslation = async (wordKey, word) => {
    if (wordTranslations[wordKey]) return;
    setTranslatingKey(wordKey);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this single Hebrew word to English: "${word}". Return JSON with: english (string, short 1-3 word translation).`,
        response_json_schema: { type: 'object', properties: { english: { type: 'string' } } }
      });
      setWordTranslations(prev => ({ ...prev, [wordKey]: result.english }));
    } catch (e) {}
    setTranslatingKey(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sort transcript indices by start time for correct active highlighting
  // Use index-based sorted array to avoid object identity issues after edits
  const sortedIndices = transcript
    .map((seg, i) => ({ i, start: seg.start || 0 }))
    .sort((a, b) => a.start - b.start);

  const getIsActive = (segIdx) => {
    const seg = transcript[segIdx];
    const sortedPos = sortedIndices.findIndex(s => s.i === segIdx);
    const nextEntry = sortedIndices[sortedPos + 1];
    const nextStart = nextEntry ? transcript[nextEntry.i]?.start ?? Infinity : Infinity;
    return currentTime >= (seg.start || 0) && currentTime < nextStart;
  };

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

    applyLocalEdit(segIdx, field, newFieldText);
    cancelEdit();

    if (onEditWord) onEditWord(segIdx, field, newFieldText);

    try {
      // Only auto-translate if editing the native language fields (not english)
      if (field === 'transliteration') {
        await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Translate this sentence to English: "${newFieldText}". Return JSON with: english (string).`,
          response_json_schema: { type: "object", properties: { english: { type: "string" } } }
        });
        if (result.english) { applyLocalEdit(segIdx, 'english', result.english); onEditWord(segIdx, 'english', result.english); }
      } else if (field === 'hebrew') {
        await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `For this Hebrew text: "${newFieldText}", provide: transliteration (Latin phonetic) and english (English translation). Return JSON.`,
          response_json_schema: { type: "object", properties: { transliteration: { type: "string" }, english: { type: "string" } } }
        });
        if (result.transliteration) { applyLocalEdit(segIdx, 'transliteration', result.transliteration); onEditWord(segIdx, 'transliteration', result.transliteration); }
        if (result.english) { applyLocalEdit(segIdx, 'english', result.english); onEditWord(segIdx, 'english', result.english); }
      }
      // If editing 'english' field directly, no LLM call needed
    } catch (e) {
      console.error('Re-translation failed', e);
    }

    setSavingCell(false);
  };

  const startEditSegment = (segIdx) => {
    const seg = transcript[segIdx];
    setEditingSegment(segIdx);
    setEditSegmentData({ transliteration: seg.transliteration || '', english: seg.english || '', hebrew: seg.hebrew || '' });
  };

  const saveEditSegment = (segIdx) => {
    Object.entries(editSegmentData).forEach(([field, value]) => {
      applyLocalEdit(segIdx, field, value);
      if (onEditWord) onEditWord(segIdx, field, value);
    });
    setEditingSegment(null);
  };

  const deleteSegment = (segIdx) => {
    setLocalTranscript(prev => prev.filter((_, i) => i !== segIdx));
    if (onDeleteSegment) onDeleteSegment(segIdx);
    setEditingSegmentTime(null);
  };

  const addWordToSegment = async (segIdx, field, afterIdx) => {
    const segment = transcript[segIdx];
    const words = getWordsArray(segment[field]);
    words.splice(afterIdx + 1, 0, "___");
    const newText = words.join(' ');
    applyLocalEdit(segIdx, field, newText);
    if (onEditWord) onEditWord(segIdx, field, newText);
    setEditingCell({ segIdx, field, wordIdx: afterIdx + 1 });
    setEditCellValue("");
  };

  const renderWords = (segIdx, field, text, textClassName) => {
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
          const wordKey = `${segIdx}-${field}-${wordIdx}`;
          const isWordActive = activeWordKey === wordKey;
          return (
            <React.Fragment key={wordIdx}>
            <span className="inline-block relative">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWordActive) {
                    setActiveWordKey(null);
                  } else {
                    setActiveWordKey(wordKey);
                    fetchWordTranslation(wordKey, word);
                  }
                }}
                className={`${textClassName} cursor-pointer hover:opacity-80 transition-opacity ${isWordActive ? 'underline' : ''}`}
              >
                {word}
              </span>
              {/* Popup on click */}
              {isWordActive && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 bg-slate-800 rounded-xl px-2 py-1.5 shadow-xl border border-white/10 whitespace-nowrap gap-1">
                  <span className="text-green-300 text-xs font-semibold">
                    {translatingKey === wordKey ? '...' : (wordTranslations[wordKey] || '...')}
                  </span>
                  <span className="flex gap-1">
                    {onAddWord && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddWord(word); setActiveWordKey(null); }}
                        className="text-sm hover:scale-110 transition-transform"
                        title="Add to backpack"
                      >
                        🎒
                      </button>
                    )}
                  </span>
                </span>
              )}
            </span>
            {wordIdx < words.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  return (
    <div className="w-full bg-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        {canEdit && (
          <p className="text-white/30 text-xs">Click word to edit • Leave empty to delete • + to add after</p>
        )}
        {!canEdit && (
          <p className="text-white/30 text-xs">Hover a word and click 🎒 to add to backpack</p>
        )}
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setHideTranslit(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all border ${
              hideTranslit
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
            }`}
          >
            {hideTranslit ? '👁 Translit' : '🚫 Translit'}
          </button>
          <button
            onClick={() => setHideEnglish(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all border ${
              hideEnglish
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
            }`}
          >
            {hideEnglish ? '👁 English' : '🚫 English'}
          </button>
          <button
            onClick={() => setShowPhonetics(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
              showPhonetics
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
            }`}
          >
            {showPhonetics ? '🔤 Show Transliteration' : 'אָ Show Phonetics'}
          </button>
        </div>
      </div>
      <div className="space-y-1 flex flex-col items-center" onClick={() => setActiveWordKey(null)}>
        {transcript.map((segment, segIdx) => {
          if (!segment.transliteration) return null;
          const isActive = getIsActive(segIdx);

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
                              applyLocalEdit(segIdx, 'start', secs);
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
                            applyLocalEdit(segIdx, 'start', secs);
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
                      if (isActive && isPlayingProp) {
                        onSeekTo(segment.start, false);
                      } else if (isActive && !isPlayingProp) {
                        onSeekTo(segment.start, true);
                      } else {
                        onSeekTo(segment.start, true);
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
                    {isActive && isPlayingProp ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {formatTime(segment.start)}
                  </button>
                )}
              </div>

              {/* Text Block */}
              <div className="flex-1 space-y-0">
                {editingSegment === segIdx ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editSegmentData.transliteration}
                      onChange={e => setEditSegmentData(prev => ({ ...prev, transliteration: e.target.value }))}
                      placeholder="Transliteration..."
                      rows={2}
                      className="w-full bg-white/10 border border-yellow-400/50 text-white text-sm rounded-lg px-2 py-1 outline-none resize-none"
                    />
                    <textarea
                      value={editSegmentData.english}
                      onChange={e => setEditSegmentData(prev => ({ ...prev, english: e.target.value }))}
                      placeholder="English..."
                      rows={1}
                      className="w-full bg-white/10 border border-yellow-400/30 text-white/70 text-sm rounded-lg px-2 py-1 outline-none resize-none"
                    />
                    <textarea
                      value={editSegmentData.hebrew}
                      onChange={e => setEditSegmentData(prev => ({ ...prev, hebrew: e.target.value }))}
                      placeholder="Hebrew..."
                      rows={1}
                      dir="rtl"
                      className="w-full bg-white/10 border border-cyan-400/30 text-cyan-300 text-sm rounded-lg px-2 py-1 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEditSegment(segIdx)} className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/40 text-green-400 rounded text-xs hover:bg-green-500/30">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingSegment(null)} className="flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/20 text-white/60 rounded text-xs hover:bg-white/20">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                   {showPhonetics ? (
                      segment.hebrew && (
                        <p className="text-cyan-300 text-base font-medium leading-tight text-center break-words" dir="rtl">
                          {renderWords(segIdx, 'hebrew', segment.hebrew, 'text-cyan-300 text-base font-medium')}
                        </p>
                      )
                    ) : (
                      !hideTranslit && (
                        <p className="text-white text-base font-medium leading-tight text-center break-words">
                          {renderWords(segIdx, 'transliteration', segment.transliteration, 'text-white text-base font-medium')}
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditSegment(segIdx); }}
                              className="ml-2 text-sm text-yellow-300 hover:text-yellow-200 transition-colors inline"
                              title="Edit sentence"
                            >
                              ✏️
                            </button>
                          )}
                        </p>
                      )
                    )}
                    {(!hideEnglish || revealedSentences.has(segIdx)) && segment.english && (
                      <p className="text-white/60 text-sm leading-tight text-center break-words">
                        {renderWords(segIdx, 'english', segment.english, 'text-white/60 text-sm')}
                      </p>
                    )}
                   <div className="flex items-center justify-center gap-2 mt-1">
                     {segment.english && !canEdit && (
                       <button
                         onClick={(e) => { e.stopPropagation(); toggleSentenceReveal(segIdx); }}
                         className="text-[10px] text-white/30 hover:text-green-300 transition-colors"
                       >
                         {revealedSentences.has(segIdx) ? '🙈 hide' : '👁 see'}
                       </button>
                     )}
                   </div>
                  </>
                  )}
              </div>
            </div>
          );
        })}
        
        {/* Add new sentence form */}
        {canEdit && (
          <div className="mt-6 p-4 border-t border-white/10">
            <p className="text-white/60 text-sm mb-3">Add new sentence:</p>
            <div className="space-y-2">
              <textarea
                value={editSegmentData.transliteration}
                onChange={e => setEditSegmentData(prev => ({ ...prev, transliteration: e.target.value }))}
                placeholder="Transliteration..."
                rows={2}
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-2 py-1 outline-none resize-none"
              />
              <textarea
                value={editSegmentData.english}
                onChange={e => setEditSegmentData(prev => ({ ...prev, english: e.target.value }))}
                placeholder="English..."
                rows={1}
                className="w-full bg-white/10 border border-white/20 text-white/70 text-sm rounded-lg px-2 py-1 outline-none resize-none"
              />
              <textarea
                value={editSegmentData.hebrew}
                onChange={e => setEditSegmentData(prev => ({ ...prev, hebrew: e.target.value }))}
                placeholder="Hebrew..."
                rows={1}
                dir="rtl"
                className="w-full bg-white/10 border border-white/20 text-cyan-300 text-sm rounded-lg px-2 py-1 outline-none resize-none"
              />
              <button 
                onClick={() => {
                  if (editSegmentData.transliteration.trim()) {
                    const newSegment = {
                      text: editSegmentData.transliteration,
                      transliteration: editSegmentData.transliteration,
                      english: editSegmentData.english,
                      hebrew: editSegmentData.hebrew,
                      start: Math.max(...transcript.map(t => t.start || 0), 0) + 5
                    };
                    transcript.push(newSegment);
                    setEditSegmentData({ transliteration: '', english: '', hebrew: '' });
                    toast?.success?.('Sentence added!');
                  }
                }}
                className="w-full px-3 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-all font-medium"
              >
                + Add Sentence
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}