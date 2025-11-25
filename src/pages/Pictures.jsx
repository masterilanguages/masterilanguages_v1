import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PictureCard from "../components/practice/PictureCard";
import ParrotMascot from "../components/mascot/ParrotMascot";

const pictureCards = [
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b9324b0c0f25014c5938d/d31b8c35f_Screenshot2025-11-24at70051PM.png",
    hint: "This laser is here <u>to help</u>",
    hebrewWord: "לעזור",
    transliteration: "laazor",
    meaning: "To help",
    mnemonic: "Sounds like 'laser' - imagine a laser beam helping someone!"
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b9324b0c0f25014c5938d/a8bc7068f_image.png",
    hint: "A bear in a dove costume is saying 'Dov!' - a _____",
    hebrewWord: "דוב",
    transliteration: "Dov",
    meaning: "Bear",
    mnemonic: "Sounds like 'dove' - imagine a bear releasing a dove!"
  },
  {
    image: "https://images.unsplash.com/photo-1534361960057-19889db9621e?w=500",
    hint: "This clever dog knows the answer - it's a _____",
    hebrewWord: "כלב",
    transliteration: "Kelev",
    meaning: "Dog",
    mnemonic: "Sounds like 'clever' - dogs are clever animals!"
  },
  {
    image: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=500",
    hint: "A mother giving water to her child - _____",
    hebrewWord: "מים",
    transliteration: "Mayim",
    meaning: "Water",
    mnemonic: "Sounds like 'my yum' - water is my yum!"
  },
  {
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    hint: "Bread fresh from the oven, what a _____!",
    hebrewWord: "לחם",
    transliteration: "Lechem",
    meaning: "Bread",
    mnemonic: "Sounds like 'let them' - let them eat bread!"
  },
  {
    image: "https://images.unsplash.com/photo-1457089328109-e5d9bd499191?w=500",
    hint: "Flowers and pears together - a _____",
    hebrewWord: "פרח",
    transliteration: "Perach",
    meaning: "Flower",
    mnemonic: "Sounds like 'per each' - one flower per each person!"
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

export default function Pictures() {
  const [pictureCardIndex, setPictureCardIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState("all");
  const queryClient = useQueryClient();

  const { data: ratings = [] } = useQuery({
    queryKey: ['pictureWordRatings'],
    queryFn: () => base44.entities.PictureWord.list(),
  });

  const { data: wordsIKnow = [] } = useQuery({
    queryKey: ['words_i_know'],
    queryFn: () => base44.entities.Word.filter({ category: "words_i_know" }),
  });

  const rateMutation = useMutation({
    mutationFn: async ({ wordId, confidence, card }) => {
      const existing = ratings.find(r => r.word_id === wordId);
      if (existing) {
        await base44.entities.PictureWord.update(existing.id, { confidence });
      } else {
        await base44.entities.PictureWord.create({ 
          word_id: wordId, 
          hebrew_word: wordId,
          confidence 
        });
      }
      
      // If rated 5, add to "Words I Know" word bank
      if (confidence === 5 && card) {
        const alreadySaved = wordsIKnow.some(w => w.phonetic === card.transliteration);
        if (!alreadySaved) {
          await base44.entities.Word.create({
            word: card.hebrewWord,
            translation: card.meaning,
            phonetic: card.transliteration,
            category: "words_i_know",
            difficulty: "beginner",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pictureWordRatings'] });
      queryClient.invalidateQueries({ queryKey: ['words_i_know'] });
    },
  });

  const getRating = (hebrewWord) => {
    const rating = ratings.find(r => r.word_id === hebrewWord);
    return rating?.confidence || 0;
  };

  const filteredCards = selectedLevel === "all" 
    ? pictureCards 
    : pictureCards.filter(card => {
        const rating = getRating(card.hebrewWord);
        return rating === parseInt(selectedLevel) || (selectedLevel === "0" && rating === 0);
      });

  const currentCard = filteredCards[pictureCardIndex] || filteredCards[0];

  const handleNext = () => {
    setPictureCardIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setPictureCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  useEffect(() => {
    setPictureCardIndex(0);
  }, [selectedLevel]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <ParrotMascot size="sm" message="Learn with pictures!" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Picture Mnemonics
              </h1>
              <p className="text-gray-500">Learn Hebrew words through visual associations</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-48 border-2 border-violet-100 rounded-xl">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards ({pictureCards.length})</SelectItem>
                <SelectItem value="0">Not rated ({pictureCards.filter(c => getRating(c.hebrewWord) === 0).length})</SelectItem>
                <SelectItem value="1">Level 1 ({pictureCards.filter(c => getRating(c.hebrewWord) === 1).length})</SelectItem>
                <SelectItem value="2">Level 2 ({pictureCards.filter(c => getRating(c.hebrewWord) === 2).length})</SelectItem>
                <SelectItem value="3">Level 3 ({pictureCards.filter(c => getRating(c.hebrewWord) === 3).length})</SelectItem>
                <SelectItem value="4">Level 4 ({pictureCards.filter(c => getRating(c.hebrewWord) === 4).length})</SelectItem>
                <SelectItem value="5">Level 5 - Mastered ({pictureCards.filter(c => getRating(c.hebrewWord) === 5).length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {filteredCards.length === 0 ? (
          <div className="text-center py-20">
            <ParrotMascot size="lg" message="No cards in this category yet!" />
          </div>
        ) : (
          <PictureCard
            card={currentCard}
            currentIndex={pictureCardIndex}
            total={filteredCards.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onRate={(wordId, confidence) => rateMutation.mutate({ wordId, confidence, card: currentCard })}
            currentRating={getRating(currentCard?.hebrewWord)}
          />
        )}
      </div>
    </div>
  );
}