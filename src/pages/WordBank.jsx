import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ParrotMascot from "../components/mascot/ParrotMascot";

export default function WordBank() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['wordbank'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordbank'] });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ word, rating }) => {
      if (rating === 5) {
        // Move to "Words I Know"
        await base44.entities.Word.create({
          word: word.word,
          translation: word.translation,
          phonetic: word.phonetic,
          category: "words_i_know",
          difficulty: "beginner",
        });
        await base44.entities.Word.delete(word.id);
        toast.success("Moved to Words I Know!");
      } else {
        await base44.entities.Word.update(word.id, { times_practiced: rating });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordbank'] });
      queryClient.invalidateQueries({ queryKey: ['words_i_know'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-violet-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <ParrotMascot size="sm" message="Words to learn!" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Word Bank
            </h1>
            <p className="text-gray-500">Words you've saved from video transcripts</p>
          </div>
        </div>

        {words.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100">
            <ParrotMascot size="lg" message="No words yet! Click on words in video transcripts to add them here." />
          </div>
        ) : (
          <div>
            <div className="text-center mb-4 text-sm text-gray-500">
              Word {currentIndex + 1} of {words.length}
            </div>
            <AnimatePresence mode="wait">
              {words[currentIndex] && (
                <motion.div
                  key={words[currentIndex].id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-violet-100 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-violet-600">{words[currentIndex].phonetic}</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-600 text-xl">
                        {showAnswer ? words[currentIndex].translation : "_____"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(words[currentIndex].id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        onClick={() => {
                          rateMutation.mutate({ word: words[currentIndex], rating: num });
                          setShowAnswer(true);
                        }}
                        variant={words[currentIndex].times_practiced === num ? "default" : "outline"}
                        className={`w-10 h-10 p-0 text-lg font-bold ${
                          words[currentIndex].times_practiced === num
                            ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white"
                            : "border-2 border-violet-200 hover:border-violet-300"
                        }`}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                  {showAnswer && (
                    <Button
                      onClick={() => {
                        setShowAnswer(false);
                        setCurrentIndex((prev) => (prev + 1) % words.length);
                      }}
                      className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white rounded-xl"
                    >
                      Next Word <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}