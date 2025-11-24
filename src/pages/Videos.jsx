import React, { useState } from "react";
import { Play, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import YouTubePlayer from "../components/practice/YouTubePlayer";
import ClozeFlashcard from "../components/videos/ClozeFlashcard";

const videoData = [
  {
    title: "Israeli Music Vocabulary",
    url: "https://www.youtube.com/watch?v=BmbmaWQJu18",
    description: "Learn Hebrew with Israeli singers - vocabulary about music, concerts, and artists",
    flashcards: [
      { sentence: "Ha-_____ shel Eyal Golan meyuchad meod.", blank: "singer", answer: "zamar", meaning: "singer", fullTranslation: "The singer Eyal Golan is very special." },
      { sentence: "Ani ohev et ha-_____ shel ha-muzika ha-mizrachit.", blank: "style", answer: "signon", meaning: "style", fullTranslation: "I love the style of Mizrachi music." },
      { sentence: "Ha-_____ ha-ze meod yafe ve-romantit.", blank: "song", answer: "shir", meaning: "song", fullTranslation: "This song is very beautiful and romantic." },
      { sentence: "Ani ohev _____ le-muzika be-boker.", blank: "to listen", answer: "leha'azin", meaning: "to listen", fullTranslation: "I love to listen to music in the morning." },
      { sentence: "Ha-_____ hayta meod merugeshet.", blank: "concert", answer: "hofa'a", meaning: "concert/performance", fullTranslation: "The concert was very exciting." },
      { sentence: "Yesh lo _____ meod chazak ve-yafe.", blank: "voice", answer: "kol", meaning: "voice", fullTranslation: "He has a very strong and beautiful voice." },
      { sentence: "Ha-shir ha-ze meod _____ be-Yisrael.", blank: "known/famous", answer: "mukar", meaning: "known/famous", fullTranslation: "This song is very well-known in Israel." },
      { sentence: "Ha-_____ shel ha-album asah avoda nifla'a.", blank: "producer", answer: "mafik", meaning: "producer", fullTranslation: "The producer of the album did wonderful work." },
      { sentence: "Hi _____ be-moadon kol shavu'a.", blank: "performs", answer: "mofi'a", meaning: "performs", fullTranslation: "She performs at the club every week." },
      { sentence: "Ha-_____ ha-chadash shelo yatza ha-shavu'a.", blank: "album", answer: "album", meaning: "album", fullTranslation: "His new album came out this week." },
      { sentence: "Ani rotze _____ kartisim la-hofa'a.", blank: "to buy", answer: "liknot", meaning: "to buy", fullTranslation: "I want to buy tickets for the concert." },
      { sentence: "Ha-_____ shel ha-shir meod katlani.", blank: "melody", answer: "mangina", meaning: "melody", fullTranslation: "The melody of the song is very catchy." },
      { sentence: "Hu _____ gitar meod tov.", blank: "plays", answer: "menagen", meaning: "plays (instrument)", fullTranslation: "He plays guitar very well." },
      { sentence: "Ha-_____ shelah meyuchad ve-shone.", blank: "voice", answer: "kol", meaning: "voice", fullTranslation: "Her voice is unique and different." },
      { sentence: "Ani ohev _____ shirim be-ivrit.", blank: "to sing", answer: "lashir", meaning: "to sing", fullTranslation: "I love to sing songs in Hebrew." },
      { sentence: "Ha-_____ ha-ze meod me'od matzliach.", blank: "singer", answer: "zamar", meaning: "singer", fullTranslation: "This singer is very successful." },
      { sentence: "Hem _____ be-festival ha-muzika.", blank: "performed", answer: "hofi'u", meaning: "performed", fullTranslation: "They performed at the music festival." },
      { sentence: "Ha-_____ shelcha mamash yafot.", blank: "lyrics", answer: "milim", meaning: "lyrics/words", fullTranslation: "Your lyrics are really beautiful." },
      { sentence: "Ani _____ la-radio kol ha-zman.", blank: "listen", answer: "ma'azin", meaning: "listen", fullTranslation: "I listen to the radio all the time." },
      { sentence: "Ze ha-_____ ha-achi ahav alai.", blank: "song", answer: "shir", meaning: "song", fullTranslation: "This is the song I love the most." },
      { sentence: "Ha-_____ ha-zot meod energetit.", blank: "band", answer: "lehaka", meaning: "band", fullTranslation: "This band is very energetic." },
      { sentence: "Ani holech la-_____ ha-layla.", blank: "concert", answer: "hofa'a", meaning: "concert", fullTranslation: "I'm going to the concert tonight." },
      { sentence: "Ha-_____ shelo nishma meod atzuv.", blank: "voice", answer: "kol", meaning: "voice", fullTranslation: "His voice sounds very sad." },
      { sentence: "Hi _____ pianot me-gil tza'ir.", blank: "plays", answer: "menagenet", meaning: "plays (f.)", fullTranslation: "She plays piano since a young age." },
      { sentence: "Ha-_____ ha-chadash meod muzar.", blank: "style", answer: "signon", meaning: "style", fullTranslation: "The new style is very strange." },
      { sentence: "Ani rotze _____ et ha-shir ha-ze.", blank: "to learn", answer: "lilmod", meaning: "to learn", fullTranslation: "I want to learn this song." },
      { sentence: "Ha-_____ shelah niftach be-Eifel.", blank: "performance", answer: "hofa'a", meaning: "performance", fullTranslation: "Her performance opened in the Eiffel." },
      { sentence: "Hu _____ shirim romantiyim.", blank: "writes", answer: "kotev", meaning: "writes", fullTranslation: "He writes romantic songs." },
      { sentence: "Ha-_____ ha-ze meod popular be-Yisrael.", blank: "singer", answer: "zamar", meaning: "singer", fullTranslation: "This singer is very popular in Israel." },
      { sentence: "Ani _____ le-kol sugei muzika.", blank: "listen", answer: "ma'azin", meaning: "listen", fullTranslation: "I listen to all types of music." }
    ]
  }
];

export default function Videos() {
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState({});

  const handleNextCard = (videoIdx) => {
    setCurrentCardIndex(prev => ({
      ...prev,
      [videoIdx]: ((prev[videoIdx] || 0) + 1) % videoData[videoIdx].flashcards.length
    }));
  };

  const handlePrevCard = (videoIdx) => {
    setCurrentCardIndex(prev => ({
      ...prev,
      [videoIdx]: ((prev[videoIdx] || 0) - 1 + videoData[videoIdx].flashcards.length) % videoData[videoIdx].flashcards.length
    }));
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Video Lessons
          </h1>
          <p className="text-gray-500">Watch and practice Hebrew with cloze flashcards</p>
        </div>

        <div className="space-y-6">
          {videoData.map((video, idx) => (
            <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{video.title}</h2>
                <p className="text-gray-500 mb-4">{video.description}</p>
                <YouTubePlayer url={video.url} />
                
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setExpandedVideo(expandedVideo === idx ? null : idx)}
                    className="w-full border-2 border-violet-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl"
                  >
                    {expandedVideo === idx ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Flashcards
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Practice with {video.flashcards.length} Cloze Flashcards
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {expandedVideo === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6"
                    >
                      <div className="text-center mb-4 text-sm text-gray-500">
                        Card {(currentCardIndex[idx] || 0) + 1} of {video.flashcards.length}
                      </div>
                      <ClozeFlashcard 
                        flashcard={video.flashcards[currentCardIndex[idx] || 0]}
                        onNext={() => handleNextCard(idx)}
                        onPrev={() => handlePrevCard(idx)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}