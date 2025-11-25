import React, { useState } from "react";
import { motion } from "framer-motion";
import PictureCard from "../components/practice/PictureCard";
import ParrotMascot from "../components/mascot/ParrotMascot";

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
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500",
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
    image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500",
    hint: "Water is essential for _____",
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

export default function Pictures() {
  const [pictureCardIndex, setPictureCardIndex] = useState(0);

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
        </motion.div>

        <PictureCard
          card={pictureCards[pictureCardIndex]}
          currentIndex={pictureCardIndex}
          total={pictureCards.length}
          onNext={() => setPictureCardIndex((prev) => (prev + 1) % pictureCards.length)}
          onPrev={() => setPictureCardIndex((prev) => (prev - 1 + pictureCards.length) % pictureCards.length)}
        />
      </div>
    </div>
  );
}