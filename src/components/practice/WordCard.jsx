import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Check, X, Play } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import YouTubePlayer from "./YouTubePlayer";
import ExerciseCard from "./ExerciseCard";

export default function WordCard({ word, onCorrect, onSkip }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [showExercises, setShowExercises] = useState(false);

  const playAudio = () => {
    if (word.audio_url) {
      setIsPlaying(true);
      const audio = new Audio(word.audio_url);
      audio.play();
      audio.onended = () => setIsPlaying(false);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500" />
        <CardContent className="p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center px-4 py-2 bg-violet-50 rounded-full">
              <span className="text-sm font-medium text-violet-700">{word.category}</span>
            </div>

            {word.image_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto w-48 h-48 rounded-2xl overflow-hidden shadow-lg"
              >
                <img 
                  src={word.image_url} 
                  alt={word.word}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            <motion.h2 
              className="text-5xl md:text-7xl font-bold bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
              style={{ direction: "rtl" }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {word.word}
            </motion.h2>

            {word.phonetic && (
              <p className="text-xl text-gray-500 font-light tracking-wide">
                /{word.phonetic}/
              </p>
            )}

            <Button
              onClick={playAudio}
              size="lg"
              className={cn(
                "w-20 h-20 rounded-full shadow-xl transition-all duration-300",
                "bg-gradient-to-br from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600",
                isPlaying && "scale-110 shadow-2xl"
              )}
            >
              <Volume2 className={cn("w-8 h-8 text-white", isPlaying && "animate-pulse")} />
            </Button>

            {word.example_sentence && (
                              <div className="pt-4" dir="rtl">
                                <p className="text-sm text-gray-400 italic">"{word.example_sentence}"</p>
                              </div>
                            )}

                            {word.youtube_url && (
                              <div className="pt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowVideo(!showVideo)}
                                  className="border-2 border-red-200 hover:border-red-300 hover:bg-red-50 rounded-xl text-red-600"
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  {showVideo ? "Hide Video" : "Watch Video"}
                                </Button>
                                {showVideo && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-4"
                                  >
                                    <YouTubePlayer url={word.youtube_url} />
                                  </motion.div>
                                )}
                              </div>
                            )}

                            {word.exercises?.length > 0 && (
                              <div className="pt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowExercises(!showExercises)}
                                  className="border-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50 rounded-xl text-amber-600"
                                >
                                  {showExercises ? "Hide Exercises" : `Practice (${word.exercises.length} exercises)`}
                                </Button>
                                {showExercises && currentExercise < word.exercises.length && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4"
                                  >
                                    <ExerciseCard
                                      exercise={word.exercises[currentExercise]}
                                      onComplete={(correct) => {
                                        if (currentExercise < word.exercises.length - 1) {
                                          setCurrentExercise(prev => prev + 1);
                                        } else {
                                          setCurrentExercise(0);
                                          setShowExercises(false);
                                        }
                                      }}
                                    />
                                  </motion.div>
                                )}
                              </div>
                            )}

            <motion.div
              initial={false}
              animate={{ height: showTranslation ? "auto" : 0 }}
              className="overflow-hidden"
            >
              {showTranslation && (
                <div className="pt-6 pb-2">
                  <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl p-6">
                    <p className="text-2xl font-semibold text-gray-700">{word.translation}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex gap-4 pt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={onSkip}
                className="flex-1 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-gray-600"
              >
                <X className="w-5 h-5 mr-2" />
                Skip
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowTranslation(!showTranslation)}
                className="flex-1 border-2 border-violet-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl text-violet-600"
              >
                {showTranslation ? "Hide" : "Show"} Meaning
              </Button>
              <Button
                size="lg"
                onClick={onCorrect}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl shadow-lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Got it!
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}