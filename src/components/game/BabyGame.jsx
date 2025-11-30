import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Cookie, Moon, Bath, Gamepad2, Heart, Tv, Volume2, Sparkles, Check, X, Backpack, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ClickableWord from "../learning/ClickableWord";

// 100 basic Hebrew words organized by category
const wordBank = [
  // Water/Drinks (10)
  { hebrew: "מים", transliteration: "Mayim", meaning: "Water", category: "drinks", icon: "💧" },
  { hebrew: "חלב", transliteration: "Chalav", meaning: "Milk", category: "drinks", icon: "🥛" },
  { hebrew: "מיץ", transliteration: "Mitz", meaning: "Juice", category: "drinks", icon: "🧃" },
  { hebrew: "תה", transliteration: "Teh", meaning: "Tea", category: "drinks", icon: "🍵" },
  { hebrew: "קפה", transliteration: "Kafeh", meaning: "Coffee", category: "drinks", icon: "☕" },
  { hebrew: "בקבוק", transliteration: "Bakbuk", meaning: "Bottle", category: "drinks", icon: "🍼" },
  { hebrew: "כוס", transliteration: "Kos", meaning: "Cup", category: "drinks", icon: "🥤" },
  { hebrew: "קר", transliteration: "Kar", meaning: "Cold", category: "drinks", icon: "🧊" },
  { hebrew: "חם", transliteration: "Cham", meaning: "Hot", category: "drinks", icon: "🔥" },
  { hebrew: "צמא", transliteration: "Tzameh", meaning: "Thirsty", category: "drinks", icon: "😫" },
  
  // Food (15)
  { hebrew: "אוכל", transliteration: "Ochel", meaning: "Food", category: "food", icon: "🍽️" },
  { hebrew: "לחם", transliteration: "Lechem", meaning: "Bread", category: "food", icon: "🍞" },
  { hebrew: "ביצה", transliteration: "Beitzah", meaning: "Egg", category: "food", icon: "🥚" },
  { hebrew: "גבינה", transliteration: "Gvinah", meaning: "Cheese", category: "food", icon: "🧀" },
  { hebrew: "תפוח", transliteration: "Tapuach", meaning: "Apple", category: "food", icon: "🍎" },
  { hebrew: "בננה", transliteration: "Bananah", meaning: "Banana", category: "food", icon: "🍌" },
  { hebrew: "עוגה", transliteration: "Ugah", meaning: "Cake", category: "food", icon: "🍰" },
  { hebrew: "עוגייה", transliteration: "Ugiyah", meaning: "Cookie", category: "food", icon: "🍪" },
  { hebrew: "רעב", transliteration: "Ra'ev", meaning: "Hungry", category: "food", icon: "😋" },
  { hebrew: "טעים", transliteration: "Ta'im", meaning: "Delicious", category: "food", icon: "😋" },
  { hebrew: "ירקות", transliteration: "Yerakot", meaning: "Vegetables", category: "food", icon: "🥗" },
  { hebrew: "פירות", transliteration: "Perot", meaning: "Fruits", category: "food", icon: "🍇" },
  { hebrew: "בשר", transliteration: "Basar", meaning: "Meat", category: "food", icon: "🥩" },
  { hebrew: "דג", transliteration: "Dag", meaning: "Fish", category: "food", icon: "🐟" },
  { hebrew: "אורז", transliteration: "Orez", meaning: "Rice", category: "food", icon: "🍚" },

  // Sleep (10)
  { hebrew: "לישון", transliteration: "Lishon", meaning: "To sleep", category: "sleep", icon: "😴" },
  { hebrew: "עייף", transliteration: "Ayef", meaning: "Tired", category: "sleep", icon: "🥱" },
  { hebrew: "מיטה", transliteration: "Mitah", meaning: "Bed", category: "sleep", icon: "🛏️" },
  { hebrew: "כרית", transliteration: "Karit", meaning: "Pillow", category: "sleep", icon: "🛋️" },
  { hebrew: "שמיכה", transliteration: "Smichah", meaning: "Blanket", category: "sleep", icon: "🛏️" },
  { hebrew: "חלום", transliteration: "Chalom", meaning: "Dream", category: "sleep", icon: "💭" },
  { hebrew: "לילה", transliteration: "Layla", meaning: "Night", category: "sleep", icon: "🌙" },
  { hebrew: "בוקר", transliteration: "Boker", meaning: "Morning", category: "sleep", icon: "🌅" },
  { hebrew: "לקום", transliteration: "Lakum", meaning: "To wake up", category: "sleep", icon: "⏰" },
  { hebrew: "פיג'מה", transliteration: "Pijamah", meaning: "Pajamas", category: "sleep", icon: "👕" },

  // Bathroom (10)
  { hebrew: "שירותים", transliteration: "Sherutim", meaning: "Bathroom", category: "bathroom", icon: "🚽" },
  { hebrew: "פיפי", transliteration: "Pipi", meaning: "Pee", category: "bathroom", icon: "💦" },
  { hebrew: "קקי", transliteration: "Kaki", meaning: "Poop", category: "bathroom", icon: "💩" },
  { hebrew: "חיתול", transliteration: "Chitul", meaning: "Diaper", category: "bathroom", icon: "🧒" },
  { hebrew: "סבון", transliteration: "Sabon", meaning: "Soap", category: "bathroom", icon: "🧼" },
  { hebrew: "מגבת", transliteration: "Magevet", meaning: "Towel", category: "bathroom", icon: "🛁" },
  { hebrew: "מברשת שיניים", transliteration: "Mivreshet Shinayim", meaning: "Toothbrush", category: "bathroom", icon: "🪥" },
  { hebrew: "אמבטיה", transliteration: "Ambatyah", meaning: "Bath", category: "bathroom", icon: "🛁" },
  { hebrew: "נקי", transliteration: "Naki", meaning: "Clean", category: "bathroom", icon: "✨" },
  { hebrew: "מלוכלך", transliteration: "Meluchlach", meaning: "Dirty", category: "bathroom", icon: "🤢" },

  // Play (15)
  { hebrew: "לשחק", transliteration: "Lesachek", meaning: "To play", category: "play", icon: "🎮" },
  { hebrew: "צעצוע", transliteration: "Tza'atzu'a", meaning: "Toy", category: "play", icon: "🧸" },
  { hebrew: "כדור", transliteration: "Kadur", meaning: "Ball", category: "play", icon: "⚽" },
  { hebrew: "בובה", transliteration: "Bubah", meaning: "Doll", category: "play", icon: "🎎" },
  { hebrew: "משחק", transliteration: "Misachak", meaning: "Game", category: "play", icon: "🎲" },
  { hebrew: "ציור", transliteration: "Tziyur", meaning: "Drawing", category: "play", icon: "🎨" },
  { hebrew: "ספר", transliteration: "Sefer", meaning: "Book", category: "play", icon: "📚" },
  { hebrew: "שיר", transliteration: "Shir", meaning: "Song", category: "play", icon: "🎵" },
  { hebrew: "ריקוד", transliteration: "Rikud", meaning: "Dance", category: "play", icon: "💃" },
  { hebrew: "חבר", transliteration: "Chaver", meaning: "Friend", category: "play", icon: "👫" },
  { hebrew: "לרוץ", transliteration: "Larutz", meaning: "To run", category: "play", icon: "🏃" },
  { hebrew: "לקפוץ", transliteration: "Likpotz", meaning: "To jump", category: "play", icon: "🦘" },
  { hebrew: "לצחוק", transliteration: "Litschok", meaning: "To laugh", category: "play", icon: "😂" },
  { hebrew: "כיף", transliteration: "Kef", meaning: "Fun", category: "play", icon: "🎉" },
  { hebrew: "חוץ", transliteration: "Chutz", meaning: "Outside", category: "play", icon: "🌳" },

  // Emotions/Comfort (15)
  { hebrew: "חיבוק", transliteration: "Chibuk", meaning: "Hug", category: "emotions", icon: "🤗" },
  { hebrew: "אהבה", transliteration: "Ahavah", meaning: "Love", category: "emotions", icon: "❤️" },
  { hebrew: "שמח", transliteration: "Same'ach", meaning: "Happy", category: "emotions", icon: "😊" },
  { hebrew: "עצוב", transliteration: "Atzuv", meaning: "Sad", category: "emotions", icon: "😢" },
  { hebrew: "כועס", transliteration: "Ko'es", meaning: "Angry", category: "emotions", icon: "😠" },
  { hebrew: "מפחד", transliteration: "Mefached", meaning: "Scared", category: "emotions", icon: "😨" },
  { hebrew: "בוכה", transliteration: "Bocheh", meaning: "Crying", category: "emotions", icon: "😭" },
  { hebrew: "צוחק", transliteration: "Tzochek", meaning: "Laughing", category: "emotions", icon: "😄" },
  { hebrew: "נשיקה", transliteration: "Neshikah", meaning: "Kiss", category: "emotions", icon: "😘" },
  { hebrew: "אמא", transliteration: "Ima", meaning: "Mom", category: "emotions", icon: "👩" },
  { hebrew: "אבא", transliteration: "Aba", meaning: "Dad", category: "emotions", icon: "👨" },
  { hebrew: "תינוק", transliteration: "Tinok", meaning: "Baby", category: "emotions", icon: "👶" },
  { hebrew: "משפחה", transliteration: "Mishpacha", meaning: "Family", category: "emotions", icon: "👨‍👩‍👧" },
  { hebrew: "בבקשה", transliteration: "Bevakasha", meaning: "Please", category: "emotions", icon: "🙏" },
  { hebrew: "תודה", transliteration: "Todah", meaning: "Thank you", category: "emotions", icon: "🙏" },

  // Basic Actions (15)
  { hebrew: "לבוא", transliteration: "Lavo", meaning: "To come", category: "actions", icon: "🚶" },
  { hebrew: "ללכת", transliteration: "Lalechet", meaning: "To go", category: "actions", icon: "🚶" },
  { hebrew: "לראות", transliteration: "Lirot", meaning: "To see", category: "actions", icon: "👀" },
  { hebrew: "לשמוע", transliteration: "Lishmoa", meaning: "To hear", category: "actions", icon: "👂" },
  { hebrew: "לדבר", transliteration: "Ledaber", meaning: "To speak", category: "actions", icon: "🗣️" },
  { hebrew: "לאכול", transliteration: "Le'echol", meaning: "To eat", category: "actions", icon: "🍴" },
  { hebrew: "לשתות", transliteration: "Lishtot", meaning: "To drink", category: "actions", icon: "🥤" },
  { hebrew: "לתת", transliteration: "Latet", meaning: "To give", category: "actions", icon: "🎁" },
  { hebrew: "לקחת", transliteration: "Lakachat", meaning: "To take", category: "actions", icon: "✋" },
  { hebrew: "לפתוח", transliteration: "Liftoach", meaning: "To open", category: "actions", icon: "📂" },
  { hebrew: "לסגור", transliteration: "Lisgor", meaning: "To close", category: "actions", icon: "📁" },
  { hebrew: "לשבת", transliteration: "Lashevet", meaning: "To sit", category: "actions", icon: "🪑" },
  { hebrew: "לעמוד", transliteration: "La'amod", meaning: "To stand", category: "actions", icon: "🧍" },
  { hebrew: "רוצה", transliteration: "Rotzeh", meaning: "Want", category: "actions", icon: "🙋" },
  { hebrew: "צריך", transliteration: "Tzarich", meaning: "Need", category: "actions", icon: "❗" },

  // Basic Words (10)
  { hebrew: "כן", transliteration: "Ken", meaning: "Yes", category: "basic", icon: "✅" },
  { hebrew: "לא", transliteration: "Lo", meaning: "No", category: "basic", icon: "❌" },
  { hebrew: "עוד", transliteration: "Od", meaning: "More", category: "basic", icon: "➕" },
  { hebrew: "מספיק", transliteration: "Maspik", meaning: "Enough", category: "basic", icon: "✋" },
  { hebrew: "פה", transliteration: "Po", meaning: "Here", category: "basic", icon: "📍" },
  { hebrew: "שם", transliteration: "Sham", meaning: "There", category: "basic", icon: "👉" },
  { hebrew: "גדול", transliteration: "Gadol", meaning: "Big", category: "basic", icon: "🐘" },
  { hebrew: "קטן", transliteration: "Katan", meaning: "Small", category: "basic", icon: "🐜" },
  { hebrew: "טוב", transliteration: "Tov", meaning: "Good", category: "basic", icon: "👍" },
  { hebrew: "רע", transliteration: "Ra", meaning: "Bad", category: "basic", icon: "👎" },
];

const categoryInfo = {
  drinks: { label: "Drinks", color: "from-blue-400 to-cyan-400", icon: "💧" },
  food: { label: "Food", color: "from-amber-400 to-orange-400", icon: "🍽️" },
  sleep: { label: "Sleep", color: "from-indigo-400 to-purple-400", icon: "😴" },
  bathroom: { label: "Bathroom", color: "from-teal-400 to-emerald-400", icon: "🚽" },
  play: { label: "Play", color: "from-pink-400 to-rose-400", icon: "🎮" },
  emotions: { label: "Emotions", color: "from-red-400 to-pink-400", icon: "❤️" },
  actions: { label: "Actions", color: "from-green-400 to-emerald-400", icon: "🏃" },
  basic: { label: "Basics", color: "from-gray-400 to-slate-400", icon: "📝" },
};

export default function BabyGame({ avatarName, onCorrect, onWatchTV }) {
  const queryClient = useQueryClient();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Fetch word ratings from database
  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  // Get rating for a word
  const getWordRating = (hebrew) => {
    const found = wordRatings.find(w => w.word === hebrew);
    return found?.times_practiced || 0;
  };

  // Count words by rating
  const getRatingCounts = () => {
    const counts = { fluent: 0, learning: 0, unrated: 0, total: wordBank.length };
    wordBank.forEach(word => {
      const rating = getWordRating(word.hebrew);
      if (rating >= 5) counts.fluent++;
      else if (rating > 0) counts.learning++;
      else counts.unrated++;
    });
    return counts;
  };

  const counts = getRatingCounts();
  const totalRated = counts.fluent + counts.learning;
  const canWatchTV = totalRated >= 100;

  // Get next unrated or non-fluent word
  const getNextWord = () => {
    // First, try to find unrated words
    const unratedWords = wordBank.filter(w => getWordRating(w.hebrew) === 0);
    if (unratedWords.length > 0) {
      return unratedWords[Math.floor(Math.random() * unratedWords.length)];
    }
    // Then, find words rated less than 5
    const learningWords = wordBank.filter(w => {
      const rating = getWordRating(w.hebrew);
      return rating > 0 && rating < 5;
    });
    if (learningWords.length > 0) {
      return learningWords[Math.floor(Math.random() * learningWords.length)];
    }
    // All words are fluent
    return wordBank[Math.floor(Math.random() * wordBank.length)];
  };

  const [currentWord, setCurrentWord] = useState(() => getNextWord());

  useEffect(() => {
    setCurrentWord(getNextWord());
  }, [wordRatings]);

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    speechSynthesis.speak(utterance);
  };

  const handleRate = async (rating) => {
    const existingWord = wordRatings.find(w => w.word === currentWord.hebrew);
    
    if (existingWord) {
      await updateWordMutation.mutateAsync({
        id: existingWord.id,
        data: { 
          times_practiced: rating,
          mastered: rating >= 5,
        }
      });
    } else {
      await createWordMutation.mutateAsync({
        word: currentWord.hebrew,
        translation: currentWord.meaning,
        phonetic: currentWord.transliteration,
        category: "wordbank",
        times_practiced: rating,
        mastered: rating >= 5,
      });
    }

    if (rating >= 5) {
      toast.success("Added to Fluent folder! 🎉");
    } else {
      toast.success(`Rated ${rating}/5 - Keep practicing!`);
    }

    onCorrect(currentWord);
    setShowTranslation(false);
    setCurrentWord(getNextWord());
  };

  if (showIntro) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
        <div className="text-center mb-6">
          <span className="text-6xl mb-4 block">👶</span>
          <h2 className="text-2xl font-bold text-white mb-2">
            Hi! I'm {avatarName}!
          </h2>
          <p className="text-white/80 text-lg mb-4">
            Will you be my babysitter and learn Hebrew with me?
          </p>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Your Mission:
          </h3>
          <ul className="text-white/80 space-y-2 text-sm">
            <li>📚 Rate 100 Hebrew words based on your knowledge (1-5)</li>
            <li>⭐ 5 = Fluent (goes to your Fluent folder)</li>
            <li>📖 Words rated 1-4 will repeat until you master them</li>
            <li>📺 After rating 100 words, unlock Hebrew TV shows!</li>
          </ul>
        </div>

        <Button
          onClick={() => setShowIntro(false)}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-6 text-lg rounded-xl"
        >
          Let's Start! 🚀
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">Progress to TV Time</span>
          <span className="text-cyan-400 font-bold">{totalRated}/100 words</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((totalRated / 100) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-green-400">⭐ Fluent: {counts.fluent}</span>
          <span className="text-yellow-400">📚 Learning: {counts.learning}</span>
          <span className="text-white/40">❓ Unrated: {counts.unrated}</span>
        </div>
      </div>

      {/* TV Unlock */}
      {canWatchTV && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={onWatchTV}
          className="w-full mb-6 flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 rounded-xl text-white font-bold text-lg"
        >
          <Tv className="w-6 h-6" />
          🎉 Watch Hebrew TV with {avatarName}! 📺
        </motion.button>
      )}

      {/* Baby Request */}
      <div className="text-center mb-6">
        <motion.div
          key={currentWord.hebrew}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block"
        >
          <div className="bg-white/10 rounded-2xl px-8 py-6 mb-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 px-3 py-1 rounded-full text-xs text-white font-bold">
              {categoryInfo[currentWord.category]?.icon} {categoryInfo[currentWord.category]?.label}
            </div>
            
            <p className="text-white/60 text-sm mb-3 mt-2">👶 {avatarName} wants to know:</p>
            
            {/* Hebrew word - clickable */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <motion.div whileHover={{ scale: 1.05 }}>
                <ClickableWord
                  word={currentWord.hebrew}
                  transliteration={currentWord.transliteration}
                  translation={currentWord.meaning}
                  variant="hebrew"
                  className="text-5xl font-bold text-cyan-400 cursor-pointer"
                />
              </motion.div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playAudio(currentWord.hebrew)}
                className="text-cyan-400"
              >
                <Volume2 className="w-6 h-6" />
              </Button>
            </div>

            {/* Transliteration */}
            <p className="text-white/80 text-xl mb-2">{currentWord.transliteration}</p>

            {/* Translation - click to reveal */}
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              {showTranslation ? (
                <span className="text-green-400 text-lg font-medium">= {currentWord.meaning}</span>
              ) : (
                "(tap to see meaning)"
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Rating Section */}
      <div className="bg-white/5 rounded-2xl p-4 mb-4">
        <p className="text-center text-white/60 text-sm mb-3">
          How well do you know this word?
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <motion.button
              key={num}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRate(num)}
              className={`w-14 h-14 rounded-xl font-bold text-lg transition-all ${
                num === 5
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                  : num >= 4
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  : num >= 3
                  ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              }`}
            >
              {num}
              {num === 5 && <span className="block text-xs">⭐</span>}
            </motion.button>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-white/40 px-2">
          <span>Don't know</span>
          <span>Fluent</span>
        </div>
      </div>

      {/* Backpack Button */}
      <Button
        variant="outline"
        className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
        onClick={() => toast.info(`Fluent: ${counts.fluent} words | Learning: ${counts.learning} words`)}
      >
        <Backpack className="w-5 h-5 mr-2" />
        My Backpack ({counts.fluent} Fluent, {counts.learning} Learning)
      </Button>
    </div>
  );
}