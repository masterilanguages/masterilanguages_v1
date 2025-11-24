import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Check, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ClozeFlashcard({ flashcard, onNext, onPrev, onRate }) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleRate = (rating) => {
    setShowAnswer(false);
    if (onRate) onRate(rating);
    onNext();
  };

  const handlePrev = () => {
    setShowAnswer(false);
    onPrev();
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl p-6 border border-violet-100">
      {/* Sentence with blank */}
      <div className="text-center mb-6">
        <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed">
          {flashcard.sentence.replace("_____", `_____ (${flashcard.blank})`)}
        </p>
      </div>

      {/* Show/Hide Answer Button */}
      <div className="flex justify-center mb-4">
        <Button
          onClick={() => setShowAnswer(!showAnswer)}
          className={cn(
            "rounded-xl px-6",
            showAnswer 
              ? "bg-violet-100 text-violet-700 hover:bg-violet-200" 
              : "bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
          )}
        >
          {showAnswer ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide Answer
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Show Answer
            </>
          )}
        </Button>
      </div>

      {/* Answer Section */}
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 text-center"
          >
            {/* Answer */}
            <div className="bg-white rounded-xl p-4 border border-violet-200">
              <p className="text-sm text-gray-500 mb-1">Answer (Transliterated Hebrew)</p>
              <p className="text-2xl font-bold text-violet-600">{flashcard.answer}</p>
            </div>

            {/* Meaning */}
            <div className="bg-white rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-gray-500 mb-1">English Meaning</p>
              <p className="text-lg font-semibold text-blue-600">{flashcard.meaning}</p>
            </div>

            {/* Full Translation */}
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <p className="text-sm text-gray-500 mb-1">Full Sentence Translation</p>
              <p className="text-lg text-green-700">{flashcard.fullTranslation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Buttons */}
      {showAnswer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center gap-4 mt-6"
        >
          <Button
            onClick={() => handleRate("repeat")}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Repeat Later
          </Button>
          <Button
            onClick={() => handleRate("know")}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3"
          >
            <Check className="w-4 h-4 mr-2" />
            I Know It
          </Button>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          className="border-2 border-gray-200 hover:border-gray-300 rounded-xl"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => { setShowAnswer(false); onNext(); }}
          className="border-2 border-gray-200 hover:border-gray-300 rounded-xl"
        >
          Skip
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}