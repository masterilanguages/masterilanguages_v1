import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pause, RefreshCw, Check } from "lucide-react";

const RATINGS = [
  { value: 1, label: "1", color: "#ef4444" },
  { value: 2, label: "2", color: "#f97316" },
  { value: 3, label: "3", color: "#eab308" },
  { value: 5, label: "M ⭐", color: "#22c55e" },
];

export default function PostVideoFlashcards({ words, onClose, onJournal, videoTitle, userProfile }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState("intro");
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showHebrew, setShowHebrew] = useState(true);
  const [showEnglish, setShowEnglish] = useState(false);
  const [mnemonicData, setMnemonicData] = useState({});

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (data) => base44.entities.Word.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const getKey = (word) => word.id || word.phonetic;

  useEffect(() => {
    if (step !== "flashcards") return;
    const word = words[cardIdx];
    if (!word) return;
    const key = getKey(word);
    if (word.image_url && !mnemonicData[key]) {
      setMnemonicData(prev => ({ ...prev, [key]: { image_url: word.image_url, explanation: null, loading: false } }));
      return;
    }
    if (mnemonicData[key]) return;
    generateMnemonic(word);
  }, [cardIdx, step]);

  const generateMnemonic = async (word) => {
    const key = getKey(word);
    setMnemonicData(prev => ({ ...prev, [key]: { ...(prev[key] || {}), loading: true } }));
    try {
      const concept = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a mnemonic to remember the word "${word.phonetic}" meaning "${word.translation}".
Find an English word/phrase that SOUNDS like "${word.phonetic}" and connect it visually to the meaning "${word.translation}".
Return JSON with:
- sound_anchor: English word/phrase that sounds like the target word
- explanation: one punchy memorable sentence (e.g. "NET-inah → picture a NET catching GIFTS — giving!")
- image_prompt: vivid cartoon scene description (no text in image, single clear subject, bright colors)`,
        response_json_schema: {
          type: "object",
          properties: {
            sound_anchor: { type: "string" },
            explanation: { type: "string" },
            image_prompt: { type: "string" }
          }
        }
      });

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: `${concept.image_prompt}. Cartoon style, vibrant colors, fun and memorable, white or plain background, single clear subject. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
      });

      setMnemonicData(prev => ({
        ...prev,
        [key]: { image_url: imageResult.url, explanation: concept.explanation, loading: false }
      }));
    } catch (e) {
      setMnemonicData(prev => ({ ...prev, [key]: { ...(prev[key] || {}), loading: false } }));
      toast.error("Failed to generate mnemonic");
    }
  };

  const handleRate = async (word, rating) => {
    setSaving(true);
    const key = getKey(word);
    const imageUrl = mnemonicData[key]?.image_url;
    setResults(prev => [...prev, { word, rating }]);

    if (word.id) {
      await updateWordMutation.mutateAsync({
        id: word.id,
        data: { times_practiced: rating, mastered: rating >= 5, ...(imageUrl ? { image_url: imageUrl } : {}) }
      });
    } else {
      await createWordMutation.mutateAsync({
        word: word.word,
        translation: word.translation,
        phonetic: word.phonetic,
        category: "wordbank",
        language: userProfile?.language || "hebrew",
        times_practiced: rating,
        mastered: rating >= 5,
        vocab_level: 0,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
    }

    setSaving(false);
    if (cardIdx + 1 >= words.length) {
      setStep("done");
    } else {
      setCardIdx(i => i + 1);
      setFlipped(false);
    }
  };

  const handleApprove = async (word) => {
    if (!word.id) return;
    await updateWordMutation.mutateAsync({ id: word.id, data: { approved: !word.approved } });
    toast.success(word.approved ? "Approval removed" : "Card approved ✅");
  };

  const handleSkip = () => {
    if (cardIdx + 1 >= words.length) setStep("done");
    else { setCardIdx(i => i + 1); setFlipped(false); }
  };

  const currentWord = words[cardIdx];
  const currentKey = currentWord ? getKey(currentWord) : null;
  const currentMnemonic = currentKey ? mnemonicData[currentKey] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 100%)' }}>

      {/* Pause button */}
      <button
        onClick={() => setConfirmLeave(true)}
        className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors p-2 rounded-full hover:bg-stone-200 z-10"
      >
        <Pause className="w-6 h-6" />
      </button>

      {/* Confirm leave dialog */}
      {confirmLeave && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">⏸️</div>
            <h3 className="text-stone-800 font-bold text-lg">Leave this session?</h3>
            <p className="text-stone-500 text-sm">Your progress so far will be saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                Keep Going
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-md w-full text-center space-y-6"
          >
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-stone-800 text-2xl font-bold">Great job watching!</h2>
            <p className="text-stone-600 text-base">
              You just watched <span className="text-cyan-600 font-semibold">"{videoTitle}"</span>.<br/>
              Let's lock in the key vocab words.
            </p>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 text-left space-y-2 shadow-sm">
              <ul className="space-y-2 text-stone-500 text-sm">
                <li>🎨 Auto mnemonic image + explanation generated per word</li>
                <li>👆 Tap card to reveal the meaning</li>
                <li>⭐ Rate your knowledge — saved to your Backpack</li>
                <li>✅ Approve a card to lock it in</li>
              </ul>
            </div>
            <p className="text-stone-400 text-sm">{words.length} words to review</p>
            <button
              onClick={() => setStep("flashcards")}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              Start Flashcards →
            </button>
          </motion.div>
        )}

        {step === "flashcards" && currentWord && (
          <motion.div
            key={`card-${cardIdx}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            className="w-full max-w-sm flex flex-col gap-3"
          >
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${(cardIdx / words.length) * 100}%` }}
                />
              </div>
              <span className="text-stone-400 text-xs">{cardIdx + 1} / {words.length}</span>
            </div>

            {/* Show/hide toggles */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowHebrew(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  showHebrew
                    ? 'bg-cyan-100 border-cyan-300 text-cyan-700'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {showHebrew ? '👁 Hebrew' : '🙈 Hebrew'}
              </button>
              <button
                onClick={() => setShowEnglish(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  showEnglish
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                {showEnglish ? '👁 English' : '🙈 English'}
              </button>
            </div>

            {/* Card */}
            <div
              className="w-full rounded-3xl overflow-hidden cursor-pointer select-none shadow-lg"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
              onClick={() => setFlipped(true)}
            >
              {/* Approved badge */}
              {currentWord.approved && (
                <div className="flex items-center gap-1 px-4 py-2 bg-green-50 border-b border-green-100">
                  <span className="text-green-600 text-xs font-semibold">✅ Approved card</span>
                </div>
              )}

              {/* Mnemonic image — white bg, contain */}
              <div className="w-full flex items-center justify-center bg-white" style={{ minHeight: 200 }}>
                {currentMnemonic?.loading ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-stone-400 text-xs">Generating mnemonic...</p>
                  </div>
                ) : currentMnemonic?.image_url ? (
                  <img
                    src={currentMnemonic.image_url}
                    alt="mnemonic"
                    className="w-full"
                    style={{ objectFit: 'contain', maxHeight: 260, background: 'white' }}
                  />
                ) : (
                  <div className="py-12 text-stone-300 text-sm">No image yet</div>
                )}
              </div>

              {/* Mnemonic explanation */}
              {currentMnemonic?.explanation && (
                <div className="px-5 py-2 bg-purple-50 border-t border-purple-100">
                  <p className="text-purple-600 text-xs text-center italic">💡 {currentMnemonic.explanation}</p>
                </div>
              )}

              {/* Word info */}
              <div className="flex flex-col items-center px-6 pt-4 pb-2 gap-1">
                <p className="text-cyan-500 font-bold text-2xl">{currentWord.phonetic}</p>

                {showEnglish && (
                  <p className="text-stone-500 text-base">= {currentWord.translation}</p>
                )}

                {showHebrew && currentWord.word && (
                  <p className="text-cyan-700 font-bold text-xl" dir="rtl" style={{ fontFamily: 'serif' }}>
                    {currentWord.word}
                  </p>
                )}

                {/* Tap to reveal hint */}
                {!flipped && (
                  <p className="text-stone-300 text-xs mt-2">tap to reveal & rate</p>
                )}

                {/* Rating buttons inside card, shown after tap */}
                <AnimatePresence>
                  {flipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 w-full mt-3 mb-1"
                    >
                      {RATINGS.map(r => (
                        <button
                          key={r.value}
                          onClick={(e) => { e.stopPropagation(); handleRate(currentWord, r.value); }}
                          disabled={saving}
                          className="flex-1 py-3 px-1 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                          style={{ background: `${r.color}18`, border: `1.5px solid ${r.color}60`, color: r.color }}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : r.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom action row inside card */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const key = getKey(currentWord);
                      setMnemonicData(prev => ({ ...prev, [key]: undefined }));
                      generateMnemonic(currentWord);
                    }}
                    disabled={currentMnemonic?.loading}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-purple-500 hover:bg-purple-50 transition-all"
                    title="New mnemonic"
                  >
                    {currentMnemonic?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🎨'}
                  </button>

                  {currentWord.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(currentWord); }}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        currentWord.approved
                          ? 'bg-green-100 text-green-600'
                          : 'text-stone-400 hover:text-green-500 hover:bg-green-50'
                      }`}
                      title={currentWord.approved ? "Approved" : "Approve card"}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                  className="text-stone-300 text-xs hover:text-stone-500 transition-colors"
                >
                  Skip →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-5"
          >
            <div className="text-6xl">🎒</div>
            <h2 className="text-stone-800 text-2xl font-bold">Session Complete!</h2>
            <p className="text-stone-500">
              You reviewed <span className="text-cyan-500 font-bold">{words.length} words</span>.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-xl p-3 flex justify-between items-center border border-stone-200 shadow-sm">
                  <span className="text-stone-600">{r.word.phonetic}</span>
                  <span className="font-bold" style={{ color: RATINGS.find(rt => rt.value === r.rating)?.color }}>
                    {r.rating === 5 ? "⭐ M" : `Lvl ${r.rating}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {onJournal && (
                <button
                  onClick={onJournal}
                  className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, #5a6b5a, #3d4a2e)' }}
                >
                  📓 Write in Journal →
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}