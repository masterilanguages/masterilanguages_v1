import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ExerciseCard({ exercise, onComplete }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (option) => {
    if (showResult) return;
    setSelectedAnswer(option);
    setShowResult(true);
    
    setTimeout(() => {
      onComplete(option === exercise.correct_answer);
      setSelectedAnswer(null);
      setShowResult(false);
    }, 1500);
  };

  const isCorrect = selectedAnswer === exercise.correct_answer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-violet-100 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{exercise.question}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exercise.options?.map((option, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => handleSelect(option)}
            disabled={showResult}
            className={cn(
              "h-auto py-4 px-6 text-left justify-start border-2 rounded-xl transition-all",
              showResult && option === exercise.correct_answer && "border-green-500 bg-green-50 text-green-700",
              showResult && selectedAnswer === option && option !== exercise.correct_answer && "border-red-500 bg-red-50 text-red-700",
              !showResult && "hover:border-violet-300 hover:bg-violet-50"
            )}
          >
            <span className="flex-1">{option}</span>
            {showResult && option === exercise.correct_answer && <Check className="w-5 h-5 text-green-600" />}
            {showResult && selectedAnswer === option && option !== exercise.correct_answer && <X className="w-5 h-5 text-red-600" />}
          </Button>
        ))}
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "mt-4 p-3 rounded-lg text-center font-medium",
            isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}
        >
          {isCorrect ? "Correct! 🎉" : `Incorrect. The answer is: ${exercise.correct_answer}`}
        </motion.div>
      )}
    </motion.div>
  );
}