import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AnimatedParrot from "../components/mascot/AnimatedParrot";

const colors = [
  { hebrew: "אדום", transliteration: "adom", meaning: "red", color: "#EF4444" },
  { hebrew: "כחול", transliteration: "kachol", meaning: "blue", color: "#3B82F6" },
  { hebrew: "ירוק", transliteration: "yarok", meaning: "green", color: "#22C55E" },
  { hebrew: "צהוב", transliteration: "tsahov", meaning: "yellow", color: "#EAB308" },
  { hebrew: "כתום", transliteration: "katom", meaning: "orange", color: "#F97316" },
  { hebrew: "סגול", transliteration: "sagol", meaning: "purple", color: "#A855F7" },
  { hebrew: "ורוד", transliteration: "varod", meaning: "pink", color: "#EC4899" },
  { hebrew: "לבן", transliteration: "lavan", meaning: "white", color: "#F3F4F6" },
  { hebrew: "שחור", transliteration: "shachor", meaning: "black", color: "#1F2937" },
  { hebrew: "חום", transliteration: "chum", meaning: "brown", color: "#92400E" },
  { hebrew: "אפור", transliteration: "afor", meaning: "gray", color: "#6B7280" },
  { hebrew: "זהב", transliteration: "zahav", meaning: "gold", color: "#D97706" },
];

export default function ColorsLesson() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const [viewedColors, setViewedColors] = useState(new Set([0]));
  const [lessonComplete, setLessonComplete] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['lessonProgress', 'ColorsLesson'],
    queryFn: () => base44.entities.LessonProgress.filter({ lesson_name: 'ColorsLesson' }),
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
      toast.success("Colors lesson completed!");
      setLessonComplete(true);
    },
  });

  const current = colors[currentIndex];

  useEffect(() => {
    if (viewedColors.size === colors.length && !lessonComplete) {
      completeLessonMutation.mutate();
    }
  }, [viewedColors.size]);

  const next = () => {
    setShowAnswer(false);
    const nextIdx = (currentIndex + 1) % colors.length;
    setCurrentIndex(nextIdx);
    setViewedColors(prev => new Set([...prev, nextIdx]));
    setTrigger(t => t + 1);
  };

  const prev = () => {
    setShowAnswer(false);
    const prevIdx = (currentIndex - 1 + colors.length) % colors.length;
    setCurrentIndex(prevIdx);
    setViewedColors(prev => new Set([...prev, prevIdx]));
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl("Progress")} className="text-violet-600 hover:text-violet-700 mb-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Schedule
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <AnimatedParrot trigger={trigger} size="sm" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Colors</h1>
            <p className="text-gray-500">{viewedColors.size} of {colors.length} viewed</p>
          </div>
          {lessonComplete && (
            <Button
              onClick={() => navigate(createPageUrl("ColorsTest"))}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Take Test
            </Button>
          )}
        </div>

        {lessonComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-2xl p-4 mb-6 flex items-center gap-4"
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-green-800">Lesson Complete!</p>
              <p className="text-green-700 text-sm">You've viewed all 12 colors. Ready for the test?</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-white rounded-2xl shadow-xl p-8 border-2 border-violet-100"
          >
            <div 
              className="w-32 h-32 rounded-2xl mx-auto mb-6 shadow-lg"
              style={{ backgroundColor: current.color }}
            />
            
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-800 mb-2" dir="rtl">{current.hebrew}</p>
              <p className="text-xl text-violet-600 mb-2">{current.transliteration}</p>
              
              <Button
                variant="outline"
                onClick={() => setShowAnswer(!showAnswer)}
                className="mt-4"
              >
                {showAnswer ? "Hide" : "Show"} Meaning
              </Button>

              {showAnswer && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl text-gray-600 mt-4 font-medium"
                >
                  {current.meaning}
                </motion.p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button onClick={prev} variant="outline" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <Button onClick={next} className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl">
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}