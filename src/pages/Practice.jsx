import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import WordCard from "../components/practice/WordCard";
import SoundWave from "../components/practice/SoundWave";
import ParrotMascot from "../components/mascot/ParrotMascot";


export default function Practice() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("dont-know");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  
  const queryClient = useQueryClient();

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['words', selectedCategory],
    queryFn: () => {
      if (selectedCategory === "all") {
        return base44.entities.Word.list("-created_date");
      }
      return base44.entities.Word.filter({ category: selectedCategory }, "-created_date");
    },
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
    },
  });

  const filteredByFolder = words.filter(word => {
    const rating = word.times_practiced || 0;
    if (selectedFolder === "know") return rating >= 5;
    if (selectedFolder === "dont-know") return rating < 5;
    return true;
  });

  useEffect(() => {
    if (filteredByFolder.length > 0) {
      const shuffled = [...filteredByFolder].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
      setCurrentWordIndex(0);
    } else {
      setSessionWords([]);
    }
  }, [words, selectedFolder, selectedCategory]);

  const currentWord = sessionWords[currentWordIndex];

  const handleRate = async (wordId, rating) => {
    await updateWordMutation.mutateAsync({
      id: wordId,
      data: {
        times_practiced: rating,
        mastered: rating >= 5,
      },
    });
    setSessionStats(prev => ({ 
      correct: rating >= 4 ? prev.correct + 1 : prev.correct, 
      total: prev.total + 1 
    }));
    moveToNext();
  };

  const handleSkip = () => {
    moveToNext();
  };

  const moveToNext = () => {
    if (currentWordIndex < sessionWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setCurrentWordIndex(0);
      const shuffled = [...sessionWords].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
    }
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, total: 0 });
    setCurrentWordIndex(0);
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setSessionWords(shuffled);
  };

  if (isLoading) {
    return (
              <div className="flex items-center justify-center min-h-screen">
                <SoundWave isPlaying={true} />
              </div>
            );
          }

          return (
            <div className="min-h-screen p-4 md:p-8">
              <div className="max-w-4xl mx-auto">
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        Practice Session
                      </h1>
                      <p className="text-gray-500">Listen, learn, and master pronunciation</p>
                    </div>
                    <Button
                      onClick={resetSession}
                      variant="outline"
                      className="border-2 border-violet-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </motion.div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                                <SelectTrigger className="w-full md:w-64 border-2 border-violet-100 rounded-xl">
                                  <SelectValue placeholder="Select folder" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dont-know">📚 Words I Don't Know ({words.filter(w => (w.times_practiced || 0) < 5).length})</SelectItem>
                                  <SelectItem value="know">✅ Words I Know ({words.filter(w => (w.times_practiced || 0) >= 5).length})</SelectItem>
                                  <SelectItem value="all">All Words ({words.length})</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full md:w-64 border-2 border-violet-100 rounded-xl">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  <SelectItem value="basics">Basics</SelectItem>
                                  <SelectItem value="numbers">Numbers</SelectItem>
                                  <SelectItem value="colors">Colors</SelectItem>
                                  <SelectItem value="food">Food</SelectItem>
                                  <SelectItem value="animals">Animals</SelectItem>
                                  <SelectItem value="travel">Travel</SelectItem>
                                  <SelectItem value="nature">Nature</SelectItem>
                                  <SelectItem value="business">Business</SelectItem>
                                  <SelectItem value="emotions">Emotions</SelectItem>
                                  <SelectItem value="actions">Actions</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="flex gap-4 items-center flex-1">
                                <ParrotMascot 
                                  size="sm" 
                                  message={
                                    sessionStats.total === 0 ? "Let's learn!" :
                                    sessionStats.correct / sessionStats.total >= 0.8 ? "Amazing work! 🎉" :
                                    sessionStats.correct / sessionStats.total >= 0.5 ? "Keep going! 💪" :
                                    "You can do it! 🌟"
                                  }
                                />
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-violet-100 shadow-sm">
                                  <p className="text-sm text-gray-500">Progress</p>
                                  <p className="text-xl font-bold text-violet-600">
                                    {currentWordIndex + 1} / {sessionWords.length}
                                  </p>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-violet-100 shadow-sm">
                                  <p className="text-sm text-gray-500">Score</p>
                                  <p className="text-xl font-bold text-violet-600">
                                    {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
                                  </p>
                                </div>
                              </div>
                            </div>

                            {sessionWords.length === 0 ? (
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center py-20"
                              >
                                <ParrotMascot size="lg" message="Add some words to start learning!" className="mb-4" />
                              </motion.div>
                            ) : (
                              <AnimatePresence mode="wait">
                                <WordCard
                                  key={currentWord?.id}
                                  word={currentWord}
                                  onRate={handleRate}
                                  onSkip={handleSkip}
                                  currentRating={currentWord?.times_practiced || 0}
                                />
                              </AnimatePresence>
                            )}
              </div>
            </div>
          );
        }