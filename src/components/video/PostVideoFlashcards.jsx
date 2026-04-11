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
  { value: 5, label: "Mastered ⭐", color: "#22c55e" },
];

export default function PostVideoFlashcards({ words, onClose, onJournal, videoTitle, userProfile }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState("intro");
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Per-card mnemonic state
  const [mnemonicData, setMnemonicData] = useState({}); // key -> { image_url, explanation, loading }

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (data) => base44.entities.Word.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const getKey = (word) => word.id || word.phonetic;

  // Auto-generate mnemonic when card changes
  useEffect(() => {
    if (step !== "flashcards") return;
    const word = words[cardIdx];
    if (!word) return;
    const key = getKey(word);
    // Use existing image if word already has one
    const existingImage = word.image_url;
    if (existingImage && !mnemonicData[key]) {
      setMnemonicData(prev => ({ ...prev, [key]: { image_url: existingImage, explanation: null, loading: false } }));
      return;
    }
    if (mnemonicData[key]) return; // already generated
    generateMnemonic(word);
  }, [cardIdx, step]);

  const generateMnemonic = async (word) => {
    const key = getKey(word);
    setMnemonicData(prev => ({ ...prev, [key]: { ...(prev[key] || {}), loading: true } }));
    try {
      const concept = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a mnemonic to remember the word "${word.phonetic}" meaning "${word.translation}".
Find an English word/phrase that SOUNDS like "${word.phonetic}" and connect it to the meaning "${word.translation}" in a funny or vivid way.
Return JSON with: sound_anchor (English word that sounds similar), explanation (one punchy sentence like "NET-inah → imagine a NET catching gifts — giving!"), image_prompt (detailed scene for image, no text).`,
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
        prompt: `${concept.image_prompt}. Cartoon style, vibrant colors, fun and memorable, single clear subject. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS anywhere in the image.`
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
    await updateWordMutation.mutateAsync({
      id: word.id,
      data: { approved: !word.approved }
    });
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}>

      {/* Pause button */}
      <button
        onClick={() => setConfirmLeave(true)}
        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-10"
      >
        <Pause className="w-6 h-6" />
      </button>

      {/* Confirm leave dialog */}
      {confirmLeave && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="text-4xl">⏸️</div>
            <h3 className="text-white font-bold text-lg">Leave this session?</h3>
            <p className="text-white/50 text-sm">Your progress so far will be saved, but you'll exit the flashcard session.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
              >
                Keep Going
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: '#ef444420', border: '1px solid #ef444450', color: '#f87171' }}
              >
                Leave Session
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
            <h2 className="text-white text-2xl font-bold">Great job watching!</h2>
            <p className="text-white/60 text-base">
              You just watched <span className="text-cyan-300 font-semibold">"{videoTitle}"</span>.<br/>
              Let's lock in the key vocab words.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-2">
              <ul className="space-y-2 text-white/60 text-sm">
                <li>🎨 Auto mnemonic image + tip generated per word</li>
                <li>👆 Tap card to reveal meaning</li>
                <li>⭐ Rate your knowledge inside the card</li>
                <li>✅ Approve a card to lock it in for all users</li>
              </ul>
            </div>
            <p className="text-white/40 text-sm">{words.length} words to review</p>
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
            className="w-full max-w-md flex flex-col gap-3"
          >
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${(cardIdx / words.length) * 100}%` }}
                />
              </div>
              <span className="text-white/40 text-xs">{cardIdx + 1} / {words.length}</span>
            </div>

            {/* Card */}
            <div
              className="w-full rounded-3xl overflow-hidden cursor-pointer select-none"
              style={{ background: 'linear-gradient(160deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setFlipped(true)}
            >
              {/* Mnemonic image - full width, not cropped */}
              <div className="w-full flex items-center justify-center bg-black/20" style={{ minHeight: 180 }}>
                {currentMnemonic?.loading ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-white/40 text-xs">Generating mnemonic...</p>
                  </div>
                ) : currentMnemonic?.image_url ? (
                  <img
                    src={currentMnemonic.image_url}
                    alt="mnemonic"
                    className="w-full"
                    style={{ objectFit: 'contain', maxHeight: 240 }}
                  />
                ) : (
                  <div className="py-10 text-white/20 text-sm">No image</div>
                )}
              </div>

              {/* Mnemonic explanation */}
              {currentMnemonic?.explanation && (
                <div className="px-5 pt-3 pb-1">
                  <p className="text-purple-300 text-xs text-center italic">💡 {currentMnemonic.explanation}</p>
                </div>
              )}

              {/* Word info */}
              <div className="flex flex-col items-center px-6 pt-4 pb-3 gap-2">
                {currentWord.word && (
                  <p className="text-4xl font-bold text-cyan-300" dir="rtl" style={{ fontFamily: 'serif' }}>
                    {currentWord.word}
                  </p>
                )}
                <p className="text-white/70 text-xl">{currentWord.phonetic}</p>

                <AnimatePresence>
                  {flipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mt-1"
                    >
                      <p className="text-green-300 text-2xl font-bold">{currentWord.translation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!flipped && <p className="text-white/20 text-xs mt-2">tap to reveal</p>}

                {/* Rating buttons INSIDE the card */}
                <AnimatePresence>
                  {flipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 w-full mt-3"
                    >
                      {RATINGS.map(r => (
                        <button
                          key={r.value}
                          onClick={(e) => { e.stopPropagation(); handleRate(currentWord, r.value); }}
                          disabled={saving}
                          className="flex-1 py-3 px-1 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                          style={{ background: `${r.color}20`, border: `1px solid ${r.color}50`, color: r.color }}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : r.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Below card: regen + approve + skip */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const key = getKey(currentWord);
                    setMnemonicData(prev => ({ ...prev, [key]: undefined }));
                    generateMnemonic(currentWord);
                  }}
                  disabled={currentMnemonic?.loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
                >
                  {currentMnemonic?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  New Mnemonic
                </button>

                {currentWord.id && (
                  <button
                    onClick={() => handleApprove(currentWord)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={currentWord.approved
                      ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    <Check className="w-3 h-3" />
                    {currentWord.approved ? "Approved" : "Approve"}
                  </button>
                )}
              </div>

              <button onClick={handleSkip} className="text-white/30 text-sm hover:text-white/60 transition-colors px-2 py-2">
                Skip →
              </button>
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
            <h2 className="text-white text-2xl font-bold">Session Complete!</h2>
            <p className="text-white/60">
              You reviewed <span className="text-cyan-300 font-bold">{words.length} words</span>.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {results.map((r, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 flex justify-between items-center border border-white/10">
                  <span className="text-white/70">{r.word.phonetic}</span>
                  <span className="font-bold" style={{ color: RATINGS.find(rt => rt.value === r.rating)?.color }}>
                    {r.rating === 5 ? "⭐ Mastered" : `Level ${r.rating}`}
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
                className="w-full py-3 rounded-2xl font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
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