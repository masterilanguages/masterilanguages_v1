import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Plus, Check, X } from "lucide-react";
import EditableWord from "../learning/EditableWord";

function SentenceWords({ words, onAddToBackpack, showHebrew = true, showTransliteration = true }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [editingWord, setEditingWord] = useState('');
  const [editingMeaning, setEditingMeaning] = useState('');

  if (!words?.length) return null;

  const handleWordClick = (e, i) => {
    e.stopPropagation();
    if (activeIndex === i) { setActiveIndex(null); return; }
    setActiveIndex(i);
    setEditingWord(words[i].word || '');
    setEditingMeaning(words[i].meaning || '');
  };

  return (
    <div className="space-y-0.5 w-full">
      {/* Hebrew line — RTL, centered */}
      {showHebrew && (
        <p className="text-[11px] text-cyan-700 font-semibold text-center leading-snug" dir="rtl">
          {words.map((w, i) => (
            <span
              key={i}
              onClick={(e) => handleWordClick(e, i)}
              className={`cursor-pointer rounded px-0.5 transition-all ${activeIndex === i ? 'bg-cyan-100' : 'hover:bg-cyan-50'}`}
            >
              {w.hebrew || ''}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      )}

      {/* Transliteration line — centered, single line */}
      {showTransliteration && (
        <p className="text-[10px] text-stone-500 text-center leading-snug flex flex-nowrap justify-center gap-x-0.5 overflow-hidden">
          {words.map((w, i) => (
            <span
              key={i}
              onClick={(e) => handleWordClick(e, i)}
              className={`cursor-pointer rounded px-0.5 transition-all whitespace-nowrap ${activeIndex === i ? 'bg-cyan-100 text-cyan-700' : 'hover:bg-stone-100'}`}
            >
              {w.word || ''}
            </span>
          ))}
        </p>
      )}

      {/* Active word action popup — clicking a word opens edit mode directly */}
      {activeIndex !== null && (
        <div className="flex items-center justify-center gap-1 py-1">
          <span className="flex items-center gap-1 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5">
            <input
              autoFocus
              value={editingWord}
              onChange={e => setEditingWord(e.target.value)}
              placeholder="transliteration..."
              className="text-[10px] font-semibold text-cyan-700 w-20 outline-none bg-transparent border-r border-cyan-200 pr-1"
            />
            <input
              value={editingMeaning}
              onChange={e => setEditingMeaning(e.target.value)}
              placeholder="meaning..."
              className="text-[10px] text-stone-600 w-20 outline-none bg-transparent"
            />
            <button
              onClick={() => { onAddToBackpack(editingWord || words[activeIndex].word, editingMeaning); setActiveIndex(null); }}
              className="text-green-500 hover:text-green-700"
            ><Plus className="w-3 h-3" /></button>
            <button onClick={() => setActiveIndex(null)} className="text-stone-300 hover:text-stone-500"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}
    </div>
  );
}

export default function WordCard({
  word,
  showAllEnglish,
  showHebrew: showHebrewProp = true,
  showTransliteration: showTransliterationProp = true,
  onScriptToggle,
  onEnglishToggle,
  isContentEditable,
  mnemonicExplanations,
  setMnemonicExplanations,
  cardSentences,
  generatingSentence,
  fetchingTranslation,
  suggestingMnemonic,
  isAdmin,
  updateWordMutation,
  handleRateWord,
  suggestMnemonicForWord,
  approveWordMutation,
  handleDismissWord,
  deleteWordMutation,
  handleAddWordFromSentence,
  generateCardSentence,
  sessionTitleMap = {},
}) {
  const [revealed, setRevealed] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);

  const isGeneratingImage = suggestingMnemonic === word.id;

  const [showHebrewLocal, setShowHebrewLocal] = useState(showHebrewProp ?? true);
  const [showTranslitLocal, setShowTranslitLocal] = useState(showTransliterationProp ?? true);

  const showHebrew = showHebrewLocal;
  const showTransliteration = showTranslitLocal;

  const regenerateImageFromDescription = async (description) => {
    setRegeneratingImage(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A colorful cartoon illustration of: ${description}. Vibrant colors, fun and memorable, educational style. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
      });
      updateWordMutation.mutate({ id: word.id, data: { image_url: result.url } });
    } catch (e) {
      console.error("Failed to regenerate image", e);
    }
    setRegeneratingImage(false);
  };

  // click on card toggles English reveal
  const showingEnglish = showAllEnglish || revealed;

  return (
    <motion.div
      key={word.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/70 border border-stone-200 rounded-lg overflow-hidden w-48 flex flex-col"
    >
      {word.approved && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 border-b border-green-200">
          <span className="text-green-600 text-[10px] font-semibold">✅ Approved card</span>
        </div>
      )}
      {word._shared && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border-b border-blue-200">
          <span className="text-blue-600 text-[10px] font-semibold">⭐ New — tap to rank</span>
        </div>
      )}

      {/* Large mnemonic image — always visible */}
      <div
        className="relative cursor-pointer select-none bg-stone-100 overflow-hidden"
        style={{ height: '160px', minHeight: '160px' }}
        onClick={() => setRevealed(r => !r)}
      >
        {/* Top-right controls: EN, Translit, Hebrew toggles */}
        <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); if (onEnglishToggle) onEnglishToggle(); }}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all leading-none border ${
              showAllEnglish ? 'bg-stone-700 text-white border-stone-600' : 'bg-white/80 border-stone-200 text-stone-500 hover:bg-white hover:text-stone-700'
            }`}
            title="Toggle English"
          >
            EN
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTranslitLocal(v => !v); }}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all leading-none border ${
              showTranslitLocal ? 'bg-stone-700 text-white border-stone-600' : 'bg-white/80 border-stone-200 text-stone-500 hover:bg-white hover:text-stone-700'
            }`}
            title="Toggle transliteration"
          >
            abc
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowHebrewLocal(v => !v); }}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all leading-none border ${
              showHebrewLocal ? 'bg-stone-700 text-white border-stone-600' : 'bg-white/80 border-stone-200 text-stone-500 hover:bg-white hover:text-stone-700'
            }`}
            title="Toggle Hebrew"
          >
            א
          </button>
        </div>
        {word.image_url ? (
          <img src={word.image_url} alt={word.phonetic} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-400/10 via-purple-400/10 to-pink-400/10 flex flex-col items-center justify-center text-center px-4 gap-2">
            {(isGeneratingImage || regeneratingImage) ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-[10px] text-stone-400">Generating image...</span>
              </>
            ) : (
              <>
                <p className="text-cyan-600 font-bold text-xl" dir="rtl">{word.word}</p>
                <p className="text-stone-500 text-sm">{word.phonetic}</p>
              </>
            )}
          </div>
        )}

      </div>

      {/* Word info — click to toggle English reveal */}
      <div className="p-3 flex-1 flex flex-col gap-0.5 cursor-pointer select-none" onClick={() => setRevealed(r => !r)}>
        {showHebrew && (
          <p className="text-cyan-600 font-bold text-base text-center" dir="rtl">
            <EditableWord
              text={word.word}
              language="he"
              editable={isContentEditable(word)}
              onSave={(v) => updateWordMutation.mutate({ id: word.id, data: { word: v } })}
              className="text-cyan-600 font-bold text-base"
              onClick={(e) => e.stopPropagation()}
            />
          </p>
        )}

        {showTransliteration && (
          <p className="text-stone-500 text-sm text-center">
            <EditableWord
              text={word.phonetic || word.word}
              editable={true}
              onSave={(v) => updateWordMutation.mutate({ id: word.id, data: { phonetic: v } })}
              className="text-stone-500 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </p>
        )}

        {showingEnglish && (
          <p className="text-stone-700 font-semibold text-base text-center">
            <EditableWord
              text={word.translation || "(no translation)"}
              editable={true}
              onSave={(v) => updateWordMutation.mutate({ id: word.id, data: { translation: v } })}
              className="text-stone-700 font-semibold text-base"
              onClick={(e) => e.stopPropagation()}
            />
          </p>
        )}
      </div>

      {/* Mnemonic explanation below image */}
      {(mnemonicExplanations[word.id] || word.mnemonic_explanation) && (
        <div className="px-3 py-1.5 bg-purple-50 border-t border-purple-100">
          <p className="text-[10px] text-purple-600 italic text-center leading-none truncate">
            💡 {(mnemonicExplanations[word.id] || word.mnemonic_explanation).split(' ').slice(0, 5).join(' ')}
          </p>
        </div>
      )}

      {/* Source content label */}
      {word.example_sentence && (
        <div className="px-2 py-0.5 flex items-center justify-center">
          <span className="text-[10px] text-stone-400 italic truncate">
            📺 {sessionTitleMap[word.example_sentence] || word.example_sentence}
          </span>
        </div>
      )}

      {/* Verb infinitive badge */}
      {(word.is_verb || /^l/i.test(word.phonetic || '')) && (
        <div className="px-3 py-1 bg-purple-50 border-b border-purple-100 flex items-center gap-1">
          <span className="text-[10px] text-purple-500 font-semibold">verb</span>
          <span className="text-[10px] text-stone-400 mx-1">·</span>
          <span className="text-[10px] text-purple-600 font-medium">∞ {word.word || word.phonetic}</span>
        </div>
      )}



      {/* Example sentence */}
      <div className="px-2 pb-2" onClick={e => e.stopPropagation()}>
        <div className="bg-stone-50 rounded-lg p-2 border border-stone-100 min-h-[52px] flex flex-col justify-center gap-0.5">
          {generatingSentence[word.id] ? (
            <div className="flex items-center justify-center gap-1 py-1">
              <Loader2 className="w-3 h-3 animate-spin text-stone-300" />
              <span className="text-[10px] text-stone-300">generating...</span>
            </div>
          ) : cardSentences[word.id] ? (
            <>
              {/* Hebrew sentence */}
              {showHebrew && cardSentences[word.id].hebrew_sentence && (
                <p className="text-[11px] text-cyan-700 font-semibold text-center leading-snug" dir="rtl">
                  {cardSentences[word.id].hebrew_sentence}
                </p>
              )}
              {/* Transliteration — clickable words */}
              {showTransliteration && (
                <SentenceWords
                  words={cardSentences[word.id].words}
                  onAddToBackpack={handleAddWordFromSentence}
                  showHebrew={false}
                  showTransliteration={true}
                />
              )}
              {/* English + refresh */}
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className="text-[10px] text-stone-400 italic flex-1 text-center">{cardSentences[word.id].english}</p>
                <button
                  onClick={() => generateCardSentence(word)}
                  className="text-stone-300 hover:text-stone-500 flex-shrink-0 p-0.5 rounded hover:bg-stone-100 transition-all"
                  title="Regenerate sentence"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Bottom row: ratings + buttons */}
      <div className="px-2 pb-2 flex gap-1 items-center">
        <div className="flex gap-0.5 flex-1">
          {[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }, { value: 5, label: "M" }].map(({ value, label }) => (
            <button
              key={value}
              onClick={(e) => handleRateWord(word.id, value, e)}
              className={`flex-1 h-6 rounded text-xs font-bold transition-all ${
                word.times_practiced === value || (value === 3 && word.times_practiced === 4)
                  ? value === 5 ? 'bg-green-600 text-white' : 'bg-stone-600 text-white'
                  : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => suggestMnemonicForWord(word)}
          disabled={suggestingMnemonic === word.id}
          className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-purple-500/20 transition-all"
          title="Generate mnemonic image"
        >
          {suggestingMnemonic === word.id ? <Loader2 className="w-3 h-3 animate-spin text-purple-500" /> : '🎨'}
        </button>
        {isAdmin && (
          <button
            onClick={() => approveWordMutation.mutate({ id: word.id, approved: !word.approved })}
            disabled={approveWordMutation.isPending}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all ${
              word.approved ? 'bg-green-500/30 hover:bg-red-500/20 text-green-700' : 'bg-stone-100 hover:bg-green-500/20 text-stone-400'
            }`}
            title={word.approved ? "Unapprove card" : "Approve card for all users"}
          >
            ✅
          </button>
        )}
        <button
          onClick={() => word.approved && !isAdmin ? handleDismissWord(word.id) : deleteWordMutation.mutate({ id: word.id, phonetic: word.phonetic || word.word })}
          className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-red-500/20 transition-all"
          title={word.approved && !isAdmin ? "Remove from my view" : "Delete word"}
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
}