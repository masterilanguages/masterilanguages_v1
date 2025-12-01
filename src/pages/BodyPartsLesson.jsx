import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

const bodyParts = [
  { hebrew: "ראש", transliteration: "rosh", meaning: "head", emoji: "🧠" },
  { hebrew: "עין", transliteration: "ayin", meaning: "eye", emoji: "👁️" },
  { hebrew: "עיניים", transliteration: "einayim", meaning: "eyes", emoji: "👀" },
  { hebrew: "אוזן", transliteration: "ozen", meaning: "ear", emoji: "👂" },
  { hebrew: "אף", transliteration: "af", meaning: "nose", emoji: "👃" },
  { hebrew: "פה", transliteration: "peh", meaning: "mouth", emoji: "👄" },
  { hebrew: "שן", transliteration: "shen", meaning: "tooth", emoji: "🦷" },
  { hebrew: "לשון", transliteration: "lashon", meaning: "tongue", emoji: "👅" },
  { hebrew: "צוואר", transliteration: "tzavar", meaning: "neck", emoji: "🦒" },
  { hebrew: "כתף", transliteration: "katef", meaning: "shoulder", emoji: "💪" },
  { hebrew: "יד", transliteration: "yad", meaning: "hand/arm", emoji: "🤚" },
  { hebrew: "אצבע", transliteration: "etzba", meaning: "finger", emoji: "☝️" },
  { hebrew: "רגל", transliteration: "regel", meaning: "leg/foot", emoji: "🦶" },
  { hebrew: "ברך", transliteration: "berech", meaning: "knee", emoji: "🦵" },
  { hebrew: "בטן", transliteration: "beten", meaning: "stomach", emoji: "🫃" },
  { hebrew: "גב", transliteration: "gav", meaning: "back", emoji: "🔙" },
  { hebrew: "לב", transliteration: "lev", meaning: "heart", emoji: "❤️" },
  { hebrew: "שיער", transliteration: "se'ar", meaning: "hair", emoji: "💇" },
];

export default function BodyPartsLesson() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("learn"); // learn, match
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [viewed, setViewed] = useState(new Set());
  
  // Matching game state
  const [questionQueue, setQuestionQueue] = useState([]); // Queue of questions to answer
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [wordScores, setWordScores] = useState({}); // Track correct answers per word (0-5)
  const [wordAttempts, setWordAttempts] = useState({}); // Track attempts per word
  const [options, setOptions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null); // 'correct' or 'wrong'
  const [gameComplete, setGameComplete] = useState(false);

  const current = bodyParts[currentIndex];

  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.LessonProgress.filter({ lesson_name: "BodyPartsLesson" });
      if (existing.length > 0) {
        return base44.entities.LessonProgress.update(existing[0].id, { completed: true });
      }
      return base44.entities.LessonProgress.create({ lesson_name: "BodyPartsLesson", completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonProgress'] });
      toast.success("Lesson completed! ✓");
    }
  });

  const next = () => {
    setShowAnswer(false);
    setViewed(prev => new Set([...prev, currentIndex]));
    if (currentIndex === bodyParts.length - 1) {
      // Start matching game
      startMatchingGame();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prev = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + bodyParts.length) % bodyParts.length);
  };

  const startMatchingGame = () => {
    // Each word needs to be answered 5 times
    // Create a queue with each word appearing 5 times, shuffled
    const queue = [];
    bodyParts.forEach(word => {
      for (let i = 0; i < 5; i++) {
        queue.push({ ...word, attemptNum: i });
      }
    });
    
    // Shuffle but ensure no immediate repeats
    const shuffled = shuffleNoRepeats(queue);
    
    setQuestionQueue(shuffled);
    setWordScores({});
    setWordAttempts({});
    setGameComplete(false);
    setAnswered(false);
    setLastAnswer(null);
    setMode("match");
    
    // Load first question
    loadQuestion(shuffled, {});
  };

  // Shuffle array ensuring no consecutive items have the same hebrew word
  const shuffleNoRepeats = (arr) => {
    const result = [];
    const remaining = [...arr].sort(() => Math.random() - 0.5);
    
    while (remaining.length > 0) {
      let placed = false;
      for (let i = 0; i < remaining.length; i++) {
        if (result.length === 0 || result[result.length - 1].hebrew !== remaining[i].hebrew) {
          result.push(remaining.splice(i, 1)[0]);
          placed = true;
          break;
        }
      }
      // If no valid placement found (rare edge case), just add anyway
      if (!placed && remaining.length > 0) {
        result.push(remaining.shift());
      }
    }
    return result;
  };

  const loadQuestion = (queue, attempts) => {
    // Find next question that hasn't been attempted 5 times yet
    const nextQ = queue.find(q => (attempts[q.hebrew] || 0) < 5);
    
    if (!nextQ) {
      // All words have been attempted 5 times
      setGameComplete(true);
      completeLessonMutation.mutate();
      return;
    }

    setCurrentQuestion(nextQ);
    
    // Generate 4 options (including correct answer)
    const wrongOptions = bodyParts
      .filter(w => w.hebrew !== nextQ.hebrew)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [nextQ, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setAnswered(false);
    setLastAnswer(null);
  };

  const handleAnswer = (selected) => {
    if (answered) return;
    
    const isCorrect = selected.hebrew === currentQuestion.hebrew;
    setAnswered(true);
    setLastAnswer(isCorrect ? 'correct' : 'wrong');
    
    // Update attempts
    const newAttempts = {
      ...wordAttempts,
      [currentQuestion.hebrew]: (wordAttempts[currentQuestion.hebrew] || 0) + 1
    };
    setWordAttempts(newAttempts);
    
    // Update scores if correct
    if (isCorrect) {
      setWordScores(prev => ({
        ...prev,
        [currentQuestion.hebrew]: (prev[currentQuestion.hebrew] || 0) + 1
      }));
    }
    
    // Move to next question after delay
    setTimeout(() => {
      // Remove this question from queue and add back if not yet attempted 5 times
      const newQueue = questionQueue.filter(q => 
        !(q.hebrew === currentQuestion.hebrew && q.attemptNum === currentQuestion.attemptNum)
      );
      setQuestionQueue(newQueue);
      loadQuestion(newQueue, newAttempts);
    }, 1000);
  };

  const getQualification = (score) => {
    return score; // 0-5 based on correct answers
  };

  const getTotalProgress = () => {
    const totalAttempts = Object.values(wordAttempts).reduce((a, b) => a + b, 0);
    const totalNeeded = bodyParts.length * 5;
    return Math.round((totalAttempts / totalNeeded) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">🦵 Body Parts</h1>
            <p className="text-white/60">
              {mode === "learn" ? `${currentIndex + 1} of ${bodyParts.length}` : `Match the pairs! ${score}/${matchPairs.length}`}
            </p>
          </div>
        </div>

        {mode === "learn" ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-5xl">{current.emoji}</span>
                </div>
                
                <div className="text-center">
                  <p className="text-4xl font-bold text-cyan-400 mb-2" dir="rtl">{current.hebrew}</p>
                  <p className="text-xl text-white/80 mb-2">{current.transliteration}</p>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="mt-4 border-white/20 text-white hover:bg-white/10"
                  >
                    {showAnswer ? "Hide" : "Show"} Meaning
                  </Button>

                  {showAnswer && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl text-green-400 mt-4 font-medium"
                    >
                      {current.meaning}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-6">
              <Button onClick={prev} variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button onClick={next} className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-white">
                {currentIndex === bodyParts.length - 1 ? "Play Match Game" : "Next"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {matched.size === matchPairs.length ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/20 border border-green-500/50 rounded-2xl p-8 text-center"
              >
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Perfect Match!</h2>
                <p className="text-white/60 mb-6">You matched all body parts correctly!</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => { setMode("learn"); setCurrentIndex(0); }} variant="outline" className="border-white/20 text-white">
                    <RotateCcw className="w-4 h-4 mr-2" /> Learn Again
                  </Button>
                  <Button onClick={() => navigate(createPageUrl("Home"))} className="bg-gradient-to-r from-green-500 to-emerald-500">
                    Continue
                  </Button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Emojis row */}
                <div className="grid grid-cols-3 gap-3">
                  {matchPairs.map((item) => (
                    <motion.button
                      key={`emoji-${item.hebrew}`}
                      whileHover={{ scale: matched.has(item.hebrew) ? 1 : 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEmojiClick(item)}
                      className={`h-20 rounded-xl text-4xl flex items-center justify-center transition-all ${
                        matched.has(item.hebrew)
                          ? "bg-green-500/20 border-green-500/50 opacity-50"
                          : selectedEmoji?.hebrew === item.hebrew
                            ? "bg-cyan-500/30 border-cyan-400 border-2"
                            : "bg-white/10 border border-white/20 hover:border-cyan-400/50"
                      }`}
                    >
                      {item.emoji}
                    </motion.button>
                  ))}
                </div>

                <div className="text-center text-white/40 text-sm">Match emoji to Hebrew word</div>

                {/* Words row */}
                <div className="grid grid-cols-3 gap-3">
                  {[...matchPairs].sort(() => 0.5 - Math.random()).map((item) => (
                    <motion.button
                      key={`word-${item.hebrew}`}
                      whileHover={{ scale: matched.has(item.hebrew) ? 1 : 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWordClick(item)}
                      className={`h-20 rounded-xl flex flex-col items-center justify-center transition-all ${
                        matched.has(item.hebrew)
                          ? "bg-green-500/20 border-green-500/50 opacity-50"
                          : selectedWord?.hebrew === item.hebrew
                            ? "bg-purple-500/30 border-purple-400 border-2"
                            : "bg-white/10 border border-white/20 hover:border-purple-400/50"
                      }`}
                    >
                      <span className="text-cyan-400 font-bold text-lg" dir="rtl">{item.hebrew}</span>
                      <span className="text-white/60 text-xs">{item.transliteration}</span>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}