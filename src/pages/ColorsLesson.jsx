import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import QuickAddWordWidget from "../components/QuickAddWordWidget";

const colors = [
  { hebrew: "אָדוֹם", transliteration: "adom", meaning: "red", color: "#EF4444" },
  { hebrew: "כָּחוֹל", transliteration: "kachol", meaning: "blue", color: "#3B82F6" },
  { hebrew: "יָרוֹק", transliteration: "yarok", meaning: "green", color: "#22C55E" },
  { hebrew: "צָהוֹב", transliteration: "tsahov", meaning: "yellow", color: "#EAB308" },
  { hebrew: "כָּתוֹם", transliteration: "katom", meaning: "orange", color: "#F97316" },
  { hebrew: "סָגוֹל", transliteration: "sagol", meaning: "purple", color: "#A855F7" },
  { hebrew: "וָרוֹד", transliteration: "varod", meaning: "pink", color: "#EC4899" },
  { hebrew: "לָבָן", transliteration: "lavan", meaning: "white", color: "#F3F4F6" },
  { hebrew: "שָׁחוֹר", transliteration: "shachor", meaning: "black", color: "#1F2937" },
  { hebrew: "חוּם", transliteration: "chum", meaning: "brown", color: "#92400E" },
  { hebrew: "אָפוֹר", transliteration: "afor", meaning: "gray", color: "#6B7280" },
  { hebrew: "זָהָב", transliteration: "zahav", meaning: "gold", color: "#D97706" },
];

export default function ColorsLesson() {
  const [selectedColor, setSelectedColor] = useState(null);
  const [colorRatings, setColorRatings] = useState({});
  const [gameMode, setGameMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [colorScores, setColorScores] = useState({}); // tracks correct answers per color
  const [showResult, setShowResult] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
  });

  const { data: progress } = useQuery({
    queryKey: ['lessonProgress', 'ColorsLesson'],
    queryFn: () => base44.entities.LessonProgress.filter({ lesson_name: 'ColorsLesson' }),
  });

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      const existing = progress?.[0];
      if (existing) {
        return base44.entities.LessonProgress.update(existing.id, { completed: true });
      }
      return base44.entities.LessonProgress.create({ lesson_name: 'ColorsLesson', completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonProgress'] });
      toast.success("Colors lesson completed! ✓");
    },
  });

  const handleRating = async (color, rating) => {
    setColorRatings(prev => ({ ...prev, [color.meaning]: rating }));
    
    // Save to backpack
    await createWordMutation.mutateAsync({
      word: color.hebrew,
      translation: color.meaning,
      phonetic: color.transliteration,
      category: "wordbank",
      times_practiced: rating,
      mastered: rating >= 5,
    });
    
    toast.success(`Saved "${color.meaning}" with rating ${rating}!`);
    
    // Check if all colors rated
    const newRatings = { ...colorRatings, [color.meaning]: rating };
    if (Object.keys(newRatings).length === colors.length) {
      completeLessonMutation.mutate();
    }
  };

  const ratedCount = Object.keys(colorRatings).length;

  // Generate 5 questions per color (60 total), shuffled
  const startGame = () => {
    const questions = [];
    colors.forEach(color => {
      for (let i = 0; i < 5; i++) {
        // Mix question types
        const type = i % 3; // 0: hebrew->english, 1: english->hebrew, 2: color swatch->hebrew
        const wrongAnswers = colors.filter(c => c.meaning !== color.meaning);
        const shuffledWrong = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 3);
        
        if (type === 0) {
          // Show Hebrew, pick English
          questions.push({
            type: 'hebrew_to_english',
            colorKey: color.meaning,
            question: color.hebrew,
            questionSub: color.transliteration,
            options: [color, ...shuffledWrong].sort(() => Math.random() - 0.5),
            correctAnswer: color.meaning,
            answerField: 'meaning'
          });
        } else if (type === 1) {
          // Show English, pick Hebrew
          questions.push({
            type: 'english_to_hebrew',
            colorKey: color.meaning,
            question: color.meaning,
            questionColor: color.color,
            options: [color, ...shuffledWrong].sort(() => Math.random() - 0.5),
            correctAnswer: color.hebrew,
            answerField: 'hebrew'
          });
        } else {
          // Show color swatch, pick Hebrew
          questions.push({
            type: 'swatch_to_hebrew',
            colorKey: color.meaning,
            questionColor: color.color,
            options: [color, ...shuffledWrong].sort(() => Math.random() - 0.5),
            correctAnswer: color.hebrew,
            answerField: 'hebrew'
          });
        }
      }
    });
    
    // Shuffle all questions
    const shuffled = questions.sort(() => Math.random() - 0.5);
    setGameQuestions(shuffled);
    setColorScores({});
    setCurrentQuestion(0);
    setGameMode(true);
    setGameComplete(false);
  };

  const handleAnswer = async (answer) => {
    const q = gameQuestions[currentQuestion];
    const isCorrect = answer === q.correctAnswer;
    
    // Update score for this color
    setColorScores(prev => ({
      ...prev,
      [q.colorKey]: (prev[q.colorKey] || 0) + (isCorrect ? 1 : 0)
    }));
    
    setShowResult(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(async () => {
      setShowResult(null);
      
      if (currentQuestion + 1 >= gameQuestions.length) {
        // Game complete - save all scores to backpack
        setGameComplete(true);
        
        const finalScores = { ...colorScores, [q.colorKey]: (colorScores[q.colorKey] || 0) + (isCorrect ? 1 : 0) };
        
        // Save each color rating based on score (out of 5)
        for (const color of colors) {
          const score = finalScores[color.meaning] || 0;
          await createWordMutation.mutateAsync({
            word: color.hebrew,
            translation: color.meaning,
            phonetic: color.transliteration,
            category: "wordbank",
            times_practiced: score,
            mastered: score >= 5,
          });
        }
        
        setColorRatings(finalScores);
        completeLessonMutation.mutate();
        toast.success("Game complete! Scores saved to backpack!");
      } else {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">🎨 Learn Colors</h1>
            <p className="text-white/60">Tap a color to see Hebrew • Rate 1-5 to save</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-white/60 text-sm mb-2">
            <span>{ratedCount} of {colors.length} rated</span>
            {ratedCount === colors.length && (
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Complete!
              </span>
            )}
          </div>
          <div className="bg-white/10 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(ratedCount / colors.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {colors.map((color) => {
            const isExpanded = selectedColor?.meaning === color.meaning;
            const isRated = colorRatings[color.meaning] !== undefined;
            const rating = colorRatings[color.meaning];
            const isDark = !['white', 'yellow', 'gold'].includes(color.meaning);
            
            return (
              <div
                key={color.meaning}
                onClick={() => setSelectedColor(isExpanded ? null : color)}
                className={`relative rounded-2xl p-3 border-2 cursor-pointer min-h-[140px] flex flex-col justify-between ${
                  isRated 
                    ? "border-green-500/50" 
                    : isExpanded
                      ? "border-cyan-400"
                      : "border-white/10 hover:border-cyan-400/50"
                }`}
                style={{ backgroundColor: color.color }}
              >
                <p className={`text-center font-bold capitalize text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {color.meaning}
                </p>
                
                {/* Always reserve space, show content when expanded */}
                <div className="flex-1 flex flex-col justify-center">
                  {isExpanded ? (
                    <>
                      <p className={`text-xl font-bold text-center ${isDark ? 'text-cyan-300' : 'text-purple-700'}`} dir="rtl">
                        {color.hebrew}
                      </p>
                      <p className={`text-xs text-center ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                        {color.transliteration}
                      </p>
                      
                      {/* Rating buttons */}
                      <div className="flex gap-1 justify-center mt-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={(e) => { e.stopPropagation(); handleRating(color, num); }}
                            className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                              rating === num
                                ? num === 5 
                                  ? "bg-green-500 text-white" 
                                  : "bg-cyan-500 text-white"
                                : isDark
                                  ? "bg-white/20 text-white hover:bg-white/30"
                                  : "bg-black/20 text-gray-800 hover:bg-black/30"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-12" /> 
                  )}
                </div>
                
                {isRated && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                    {rating}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Complete button */}
        {ratedCount === colors.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              onClick={() => navigate(createPageUrl("ColorsTest"))}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 py-6 text-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" /> Take the Test
            </Button>
          </motion.div>
        )}
      </div>

      <QuickAddWordWidget />
    </div>
  );
}