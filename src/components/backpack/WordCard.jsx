import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Plus, Pencil, Check, X } from "lucide-react";
import EditableWord from "../learning/EditableWord";

function SentenceWords({ words, onAddToBackpack }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingMeaning, setEditingMeaning] = useState('');

  if (!words?.length) return null;

  const handleWordClick = (e, i) => {
    e.stopPropagation();
    setActiveIndex(activeIndex === i ? null : i);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-0.5 w-full">
      {/* Hebrew line — RTL, centered */}
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

      {/* Transliteration line — centered */}
      <p className="text-[10px] text-stone-500 text-center leading-snug flex flex-wrap justify-center gap-x-1">
        {words.map((w, i) => (
          <span
            key={i}
            onClick={(e) => handleWordClick(e, i)}
            className={`cursor-pointer rounded px-0.5 transition-all ${activeIndex === i ? 'bg-cyan-100 text-cyan-700' : 'hover:bg-stone-100'}`}
          >
            {w.word || ''}
          </span>
        ))}
      </p>

      {/* Active word action popup */}
      {activeIndex !== null && (
        <div className="flex items-center justify-center gap-1 py-1">
          {editingIndex === activeIndex ? (
            <span className="flex items-center gap-1 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5">
              <span className="text-[10px] font-semibold text-cyan-700 border-r border-cyan-200 pr-1">{words[activeIndex].word}</span>
              <input
                autoFocus
                value={editingMeaning}
                onChange={e => setEditingMeaning(e.target.value)}
                placeholder="meaning..."
                className="text-[10px] text-stone-600 w-20 outline-none bg-transparent"
              />
              <button
                onClick={() => { onAddToBackpack(words[activeIndex].word, editingMeaning); setActiveIndex(null); setEditingIndex(null); }}
                className="text-green-500 hover:text-green-700"
              ><Plus className="w-3 h-3" /></button>
              <button onClick={() => setEditingIndex(null)} className="text-stone-300 hover:text-stone-500"><X className="w-3 h-3" /></button>
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5">
                {words[activeIndex].word}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingIndex(activeIndex); setEditingMeaning(words[activeIndex].meaning || ''); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 transition-all"
                title="Edit meaning"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddToBackpack(words[activeIndex].word, words[activeIndex].meaning || ''); setActiveIndex(null); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-100 hover:bg-cyan-200 text-cyan-700 transition-all"
                title="Add to backpack"
              >
                🎒
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WordCard({
  word,
  showAllEnglish,
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
}) {
  const [revealed, setRevealed] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);

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

  useEffect(() => { setRevealed(false); }, [showAllEnglish]);

  // showAllEnglish=false → show Hebrew, click reveals English
  // showAllEnglish=true  → show English, click reveals Hebrew
  const showingHebrew = showAllEnglish ? revealed : !revealed;
  const showingEnglish = showAllEnglish ? !revealed : revealed;

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

      {/* Large mnemonic image — click to reveal */}
      <div
        className="h-40 bg-stone-100 flex items-center justify-center overflow-hidden relative cursor-pointer select-none"
        onClick={() => setRevealed(r => !r)}
      >
        {regeneratingImage && (
          <div className="absolute inset-0 z-10 bg-white/70 flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-[10px] text-stone-400">Generating...</span>
          </div>
        )}
        {word.image_url ? (
          <img src={word.image_url} alt={word.phonetic} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-400/20 via-purple-400/20 to-pink-400/20 flex flex-col items-center justify-center text-center px-4">
            <p className="text-cyan-600 font-bold text-xl mb-2" dir="rtl">{word.word}</p>
            <p className="text-stone-500 text-sm">{word.phonetic}</p>
          </div>
        )}
        {/* Reveal overlay */}
        {!revealed && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
            <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">tap to reveal</span>
          </div>
        )}
      </div>

      {/* Word info — also clickable to reveal */}
      <div className="p-3 flex-1 flex flex-col cursor-pointer select-none" onClick={() => setRevealed(r => !r)}>
        {showingHebrew && (
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

      {/* Verb infinitive badge */}
      {(word.is_verb || /^l[aeiou]/i.test(word.phonetic || '')) && (
        <div className="px-3 py-1 bg-purple-50 border-b border-purple-100 flex items-center gap-1">
          <span className="text-[10px] text-purple-500 font-semibold">verb</span>
          <span className="text-[10px] text-stone-400 mx-1">·</span>
          <span className="text-[10px] text-purple-600 font-medium">∞ {word.phonetic}</span>
        </div>
      )}

      {/* Mnemonic explanation */}
      {(mnemonicExplanations[word.id] || word.mnemonic_explanation) && (
        <p className="text-[10px] text-center px-2 pb-1 italic line-clamp-2 overflow-hidden" style={{ color: '#6b7c5a' }}>
          💡 <EditableWord
            text={mnemonicExplanations[word.id] || word.mnemonic_explanation}
            editable={true}
            className="text-[10px] italic"
            onSave={(val) => {
              setMnemonicExplanations(prev => ({ ...prev, [word.id]: val }));
              updateWordMutation.mutate({ id: word.id, data: { mnemonic_explanation: val } });
              regenerateImageFromDescription(val);
            }}
          />
        </p>
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
              {/* Hebrew + Transliteration — handled by SentenceWords */}
              <SentenceWords
                words={cardSentences[word.id].words}
                onAddToBackpack={handleAddWordFromSentence}
              />
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