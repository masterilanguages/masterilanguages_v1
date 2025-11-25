import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PictureCard({ card, onNext, onPrev, currentIndex, total, onRate, currentRating }) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleNext = () => {
    setShowAnswer(false);
    onNext();
  };

  const handlePrev = () => {
    setShowAnswer(false);
    onPrev();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-xl overflow-hidden max-w-lg mx-auto"
    >
      <div className="relative">
        <img 
          src={card.image} 
          alt="Mnemonic illustration" 
          className="w-full h-64 object-cover"
        />
        <div className="absolute top-3 right-3 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1}
        </div>
      </div>

      <div className="p-6">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: card.hint }} />
          <div className="flex items-center justify-center gap-3">
            {showAnswer && (
              <>
                <span className="text-3xl font-bold text-violet-600" dir="rtl">
                  {card.hebrewWord}
                </span>
                <span className="text-2xl text-gray-400">=</span>
              </>
            )}
            <span className="text-2xl font-bold text-violet-600">
              {showAnswer ? card.meaning : "_____"}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <Button
              key={num}
              onClick={() => {
                setShowAnswer(true);
                onRate(card.hebrewWord, num);
              }}
              variant={currentRating === num ? "default" : "outline"}
              className={`w-10 h-10 p-0 text-lg font-bold ${
                currentRating === num 
                  ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white" 
                  : "border-2 border-violet-200 hover:border-violet-300"
              }`}
            >
              {num}
            </Button>
          ))}
        </div>
        <p className="text-xs text-center text-gray-400 mb-4">1 = don't know → 5 = know it well</p>

        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-4 text-center"
          >
            <p className="text-xl text-gray-600 mb-1">
              {card.transliteration}
            </p>
            <p className="text-sm text-gray-500 italic">
              🧠 {card.mnemonic}
            </p>
          </motion.div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            onClick={handlePrev}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}