import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Plus, Pencil, Check, X } from "lucide-react";
import EditableWord from "../learning/EditableWord";

function SentenceWords({ words, onAddToBackpack }) {
  const [selected, setSelected] = useState(null); // index of clicked word
  const [editing, setEditing] = useState(null); // { index, word, meaning }

  if (!words?.length) return null;

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-1 justify-center mb-1">
      {words.map((w, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {editing?.index === i ? (
            <span className="flex items-center gap-0.5 bg-cyan-50 border border-cyan-200 rounded px-1 py-0.5">
              <input
                autoFocus
                value={editing.word}
                onChange={e => setEditing(prev => ({ ...prev, word: e.target.value }))}
                className="text-[10px] text-cyan-700 w-16 outline-none bg-transparent"
              />
              <input
                value={editing.meaning}
                onChange={e => setEditing(prev => ({ ...prev, meaning: e.target.value }))}
                placeholder="meaning"
                className="text-[10px] text-stone-500 w-16 outline-none bg-transparent border-l border-cyan-200 pl-1"
              />
              <button
                onClick={() => { onAddToBackpack(editing.word, editing.meaning); setEditing(null); setSelected(null); }}
                className="text-green-500 hover:text-green-700"
                title="Add to backpack"
              ><Plus className="w-3 h-3" /></button>
              <button onClick={() => { setEditing(null); setSelected(null); }} className="text-stone-300 hover:text-stone-500"><X className="w-3 h-3" /></button>
            </span>
          ) : selected === i ? (
            <span className="inline-flex items-center gap-0.5 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-cyan-700 font-medium">{w.word}</span>
              <button
                onClick={() => setEditing({ index: i, word: w.word, meaning: w.meaning })}
                className="text-cyan-400 hover:text-cyan-600 transition-all ml-1"
                title="Edit word"
              ><Pencil className="w-3 h-3" /></button>
              <button
                onClick={() => { onAddToBackpack(w.word, w.meaning); setSelected(null); }}
                className="text-green-500 hover:text-green-700 transition-all"
                title="Add to backpack"
              >🎒</button>
              <button onClick={() => setSelected(null)} className="text-stone-300 hover:text-stone-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ) : (
            <button
              onClick={() => setSelected(i)}
              className="text-[10px] text-cyan-600 italic hover:bg-cyan-50 rounded px-0.5 transition-all"
            >
              {w.word}
            </button>
          )}
        </span>
      ))}
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
        prompt: `${description}. 3D Pixar-style render, high definition, glossy and vibrant, expressive cartoon character with big eyes, cinematic lighting, ultra-detailed textures, colorful and fun. Plain white background. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
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

      {/* Word info */}
      <div className="p-3 flex-1 flex flex-col">
        {showingHebrew && (
          <p className="text-cyan-600 font-bold text-base text-center" dir="rtl">
            <EditableWord
              text={word.word}
              language="he"
              editable={isContentEditable(word)}
              onSave={(v) => updateWordMutation.mutate({ id: word.id, data: { word: v } })}
              className="text-cyan-600 font-bold text-base"
            />
          </p>
        )}
        {showingHebrew && (
          <p className="text-stone-400 text-xs text-center mt-0.5">{word.phonetic}</p>
        )}
        {showingEnglish && (
          <p className="text-stone-700 font-semibold text-base text-center">
            <EditableWord
              text={word.translation || "(no translation)"}
              editable={true}
              onSave={(v) => updateWordMutation.mutate({ id: word.id, data: { translation: v } })}
              className="text-stone-700 font-semibold text-base"
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
      <div className="px-2 pb-2">
        <div className="bg-stone-50 rounded-lg p-2 border border-stone-100 min-h-[52px] flex flex-col justify-center">
          {generatingSentence[word.id] ? (
            <div className="flex items-center justify-center gap-1 py-1">
              <Loader2 className="w-3 h-3 animate-spin text-stone-300" />
              <span className="text-[10px] text-stone-300">generating...</span>
            </div>
          ) : cardSentences[word.id] ? (
            <>
              <SentenceWords
                words={cardSentences[word.id].words}
                onAddToBackpack={handleAddWordFromSentence}
              />
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] text-stone-400 italic flex-1">{cardSentences[word.id].english}</p>
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
          onClick={() => word.approved && !isAdmin ? handleDismissWord(word.id) : deleteWordMutation.mutate(word.id)}
          className="w-6 h-6 rounded flex items-center justify-center text-sm hover:bg-red-500/20 transition-all"
          title={word.approved && !isAdmin ? "Remove from my view" : "Delete word"}
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
}