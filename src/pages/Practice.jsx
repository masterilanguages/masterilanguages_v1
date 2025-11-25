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
import PictureCard from "../components/practice/PictureCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Volume2 as AudioIcon } from "lucide-react";

export default function Practice() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [pictureCardIndex, setPictureCardIndex] = useState(0);

  const pictureCards = [
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b9324b0c0f25014c5938d/d31b8c35f_Screenshot2025-11-24at70051PM.png",
      hint: "The light is helping like a _____",
      hebrewWord: "לעזור",
      transliteration: "La'azor",
      meaning: "To help",
      mnemonic: "Sounds like 'laser' - imagine a laser beam helping someone!"
    },
    {
      image: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=500",
      hint: "A polar bear is saying 'Dov!' while giving a _____",
      hebrewWord: "דוב",
      transliteration: "Dov",
      meaning: "Bear",
      mnemonic: "Sounds like 'dove' - imagine a bear releasing a dove!"
    },
    {
      image: "https://images.unsplash.com/photo-1568702846914-96b305d2uj67?w=500",
      hint: "The dog is running around like a crazy _____",
      hebrewWord: "כלב",
      transliteration: "Kelev",
      meaning: "Dog",
      mnemonic: "Sounds like 'clever' - dogs are clever animals!"
    },
    {
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500",
      hint: "Coffee keeps you alert and _____",
      hebrewWord: "קפה",
      transliteration: "Kafeh",
      meaning: "Coffee",
      mnemonic: "Sounds like 'cafe' - where you drink coffee!"
    },
    {
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
      hint: "A man is getting his picture taken, say _____!",
      hebrewWord: "גבר",
      transliteration: "Gever",
      meaning: "Man",
      mnemonic: "Sounds like 'giver' - a man who gives!"
    },
    {
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
      hint: "A woman holds a delicate _____",
      hebrewWord: "אישה",
      transliteration: "Isha",
      meaning: "Woman",
      mnemonic: "Sounds like 'issue' - she's reading the latest issue of a magazine!"
    },
    {
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
      hint: "Water is essential for _____",
      hebrewWord: "מים",
      transliteration: "Mayim",
      meaning: "Water",
      mnemonic: "Sounds like 'my yum' - water is my yum!"
    },
    {
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",
      hint: "Bread fresh from the oven, what a _____!",
      hebrewWord: "לחם",
      transliteration: "Lechem",
      meaning: "Bread",
      mnemonic: "Sounds like 'let them' - let them eat bread!"
    },
    {
      image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=500",
      hint: "A beautiful flower blooming in the _____",
      hebrewWord: "פרח",
      transliteration: "Perach",
      meaning: "Flower",
      mnemonic: "Sounds like 'per each' - one flower per each person!"
    },
    {
      image: "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=500",
      hint: "The sun shines bright, bringing _____",
      hebrewWord: "שמש",
      transliteration: "Shemesh",
      meaning: "Sun",
      mnemonic: "Sounds like 'she mesh' - she's caught in a mesh of sunlight!"
    },
    {
      image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=500",
      hint: "A tall tree stands in the _____",
      hebrewWord: "עץ",
      transliteration: "Etz",
      meaning: "Tree",
      mnemonic: "Sounds like 'gets' - the tree gets taller every year!"
    },
    {
      image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500",
      hint: "Home is where the _____ is",
      hebrewWord: "בית",
      transliteration: "Bayit",
      meaning: "House/Home",
      mnemonic: "Sounds like 'buy it' - I want to buy it, that house!"
    }
  ];
  
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

  useEffect(() => {
    if (words.length > 0 && sessionWords.length === 0) {
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setSessionWords(shuffled);
    }
  }, [words]);

  const currentWord = sessionWords[currentWordIndex];

  const handleCorrect = async () => {
    if (currentWord) {
      await updateWordMutation.mutateAsync({
        id: currentWord.id,
        data: {
          times_practiced: (currentWord.times_practiced || 0) + 1,
          mastered: (currentWord.times_practiced || 0) + 1 >= 5,
        },
      });
      
      setSessionStats(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
      moveToNext();
    }
  };

  const handleSkip = () => {
    setSessionStats(prev => ({ ...prev, total: prev.total + 1 }));
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

                <Tabs defaultValue="audio" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-violet-50 rounded-xl p-1">
                    <TabsTrigger value="audio" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <AudioIcon className="w-4 h-4 mr-2" />
                      Audio Practice
                    </TabsTrigger>
                    <TabsTrigger value="pictures" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Image className="w-4 h-4 mr-2" />
                      Pictures
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="audio">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                          onCorrect={handleCorrect}
                          onSkip={handleSkip}
                        />
                      </AnimatePresence>
                    )}
                  </TabsContent>

                  <TabsContent value="pictures">
                    <div className="mb-6">
                      <p className="text-center text-gray-600 mb-4">
                        Learn Hebrew words through visual mnemonics - pictures that help you remember!
                      </p>
                      <PictureCard
                        card={pictureCards[pictureCardIndex]}
                        currentIndex={pictureCardIndex}
                        total={pictureCards.length}
                        onNext={() => setPictureCardIndex((prev) => (prev + 1) % pictureCards.length)}
                        onPrev={() => setPictureCardIndex((prev) => (prev - 1 + pictureCards.length) % pictureCards.length)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          );
        }