import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Cookie, Moon, Bath, Gamepad2, Heart, Tv, Volume2, Sparkles, Check, X, Backpack, Star, Loader2, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ClickableWord from "../learning/ClickableWord";
import { createPageUrl } from "@/utils";

// 100 basic Hebrew words organized by category (needs)
const wordBank = [
  // Water/Drinks (20)
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
  
  // Food (20)
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
  { hebrew: "לאכול", transliteration: "Le'echol", meaning: "To eat", category: "food", icon: "🍴" },
  { hebrew: "מתוק", transliteration: "Matok", meaning: "Sweet", category: "food", icon: "🍬" },
  { hebrew: "מלוח", transliteration: "Maluach", meaning: "Salty", category: "food", icon: "🧂" },
  { hebrew: "חריף", transliteration: "Charif", meaning: "Spicy", category: "food", icon: "🌶️" },
  { hebrew: "קינוח", transliteration: "Kinuach", meaning: "Dessert", category: "food", icon: "🍨" },

  // Sleep (20)
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
  { hebrew: "שקט", transliteration: "Sheket", meaning: "Quiet", category: "sleep", icon: "🤫" },
  { hebrew: "ער", transliteration: "Er", meaning: "Awake", category: "sleep", icon: "👁️" },
  { hebrew: "לנוח", transliteration: "Lanuach", meaning: "To rest", category: "sleep", icon: "💤" },
  { hebrew: "נמנם", transliteration: "Nimnem", meaning: "Drowsy", category: "sleep", icon: "😪" },
  { hebrew: "שעון", transliteration: "Sha'on", meaning: "Clock", category: "sleep", icon: "🕐" },
  { hebrew: "כוכבים", transliteration: "Kochavim", meaning: "Stars", category: "sleep", icon: "⭐" },
  { hebrew: "ירח", transliteration: "Yareach", meaning: "Moon", category: "sleep", icon: "🌙" },
  { hebrew: "סיפור", transliteration: "Sipur", meaning: "Story", category: "sleep", icon: "📖" },
  { hebrew: "שיר ערש", transliteration: "Shir Eres", meaning: "Lullaby", category: "sleep", icon: "🎵" },
  { hebrew: "לילה טוב", transliteration: "Layla Tov", meaning: "Good night", category: "sleep", icon: "🌙" },

  // Bathroom (20)
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
  { hebrew: "לשטוף", transliteration: "Lishtof", meaning: "To wash", category: "bathroom", icon: "🚿" },
  { hebrew: "מים חמים", transliteration: "Mayim Chamim", meaning: "Hot water", category: "bathroom", icon: "🔥" },
  { hebrew: "מים קרים", transliteration: "Mayim Karim", meaning: "Cold water", category: "bathroom", icon: "🧊" },
  { hebrew: "שמפו", transliteration: "Shampu", meaning: "Shampoo", category: "bathroom", icon: "🧴" },
  { hebrew: "מסרק", transliteration: "Masrek", meaning: "Comb", category: "bathroom", icon: "💇" },
  { hebrew: "מראה", transliteration: "Mar'ah", meaning: "Mirror", category: "bathroom", icon: "🪞" },
  { hebrew: "כיור", transliteration: "Kiyor", meaning: "Sink", category: "bathroom", icon: "🚰" },
  { hebrew: "ברז", transliteration: "Berez", meaning: "Faucet", category: "bathroom", icon: "🚿" },
  { hebrew: "משחת שיניים", transliteration: "Mishchat Shinayim", meaning: "Toothpaste", category: "bathroom", icon: "🦷" },
  { hebrew: "לנגב", transliteration: "Lenagev", meaning: "To dry", category: "bathroom", icon: "💨" },

  // Play (20)
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
  { hebrew: "פנים", transliteration: "Pnim", meaning: "Inside", category: "play", icon: "🏠" },
  { hebrew: "גן", transliteration: "Gan", meaning: "Garden", category: "play", icon: "🌻" },
  { hebrew: "נדנדה", transliteration: "Nadneda", meaning: "Swing", category: "play", icon: "🎢" },
  { hebrew: "מגלשה", transliteration: "Maglasha", meaning: "Slide", category: "play", icon: "🛝" },
  { hebrew: "חול", transliteration: "Chol", meaning: "Sand", category: "play", icon: "🏖️" },
];

const categoryInfo = {
  drinks: { label: "Water", color: "from-blue-400 to-cyan-400", icon: "💧", needText: "אני רוצה לשתות" },
  food: { label: "Food", color: "from-amber-400 to-orange-400", icon: "🍽️", needText: "אני רעב" },
  sleep: { label: "Sleep", color: "from-indigo-400 to-purple-400", icon: "😴", needText: "אני עייף" },
  bathroom: { label: "Bathroom", color: "from-teal-400 to-emerald-400", icon: "🚽", needText: "אני צריך שירותים" },
  play: { label: "Play", color: "from-pink-400 to-rose-400", icon: "🎮", needText: "אני רוצה לשחק" },
};

const needPhrases = {
  drinks: { hebrew: "אני רוצה לשתות", transliteration: "Ani rotzeh lishtot", meaning: "I want to drink" },
  food: { hebrew: "אני רעב", transliteration: "Ani ra'ev", meaning: "I am hungry" },
  sleep: { hebrew: "אני עייף", transliteration: "Ani ayef", meaning: "I am tired" },
  bathroom: { hebrew: "אני צריך שירותים", transliteration: "Ani tzarich sherutim", meaning: "I need bathroom" },
  play: { hebrew: "אני רוצה לשחק", transliteration: "Ani rotzeh lesachek", meaning: "I want to play" },
};

export default function BabyGame({ avatarName, onCorrect, onWatchTV }) {
  const queryClient = useQueryClient();
  const [gamePhase, setGamePhase] = useState("intro"); // intro, needs, wordgame
  const [currentWord, setCurrentWord] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [wrongChoices, setWrongChoices] = useState([]);
  const [generatedSentences, setGeneratedSentences] = useState(null);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [sentenceChecks, setSentenceChecks] = useState({});

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
  const canPlayWordGame = totalRated >= 100;

  // Get next unrated word
  const getNextWord = () => {
    const unratedWords = wordBank.filter(w => getWordRating(w.hebrew) === 0);
    if (unratedWords.length > 0) {
      return unratedWords[Math.floor(Math.random() * unratedWords.length)];
    }
    const learningWords = wordBank.filter(w => {
      const rating = getWordRating(w.hebrew);
      return rating > 0 && rating < 5;
    });
    if (learningWords.length > 0) {
      return learningWords[Math.floor(Math.random() * learningWords.length)];
    }
    return wordBank[Math.floor(Math.random() * wordBank.length)];
  };

  // Generate wrong choices from same category
  const generateChoices = (correctWord) => {
    const sameCategory = wordBank.filter(w => w.category === correctWord.category && w.hebrew !== correctWord.hebrew);
    const shuffled = sameCategory.sort(() => Math.random() - 0.5).slice(0, 3);
    const allChoices = [...shuffled, correctWord].sort(() => Math.random() - 0.5);
    return allChoices;
  };

  const [choices, setChoices] = useState([]);

  useEffect(() => {
    if (gamePhase === "needs" && !currentWord) {
      const nextWord = getNextWord();
      setCurrentWord(nextWord);
      setChoices(generateChoices(nextWord));
      setShowTranslation(false);
      setWrongChoices([]);
    }
  }, [gamePhase, wordRatings]);

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    speechSynthesis.speak(utterance);
  };

  const handleChoiceClick = async (choice) => {
    if (choice.hebrew === currentWord.hebrew) {
      // Correct!
      toast.success(`Correct! ${choice.icon} ${choice.meaning}`);
      
      // Save/update rating
      const existingWord = wordRatings.find(w => w.word === currentWord.hebrew);
      const newRating = (existingWord?.times_practiced || 0) + 1;
      
      if (existingWord) {
        await updateWordMutation.mutateAsync({
          id: existingWord.id,
          data: { times_practiced: Math.min(newRating, 5), mastered: newRating >= 5 }
        });
      } else {
        await createWordMutation.mutateAsync({
          word: currentWord.hebrew,
          translation: currentWord.meaning,
          phonetic: currentWord.transliteration,
          category: "wordbank",
          times_practiced: 1,
          mastered: false,
        });
      }

      onCorrect && onCorrect(currentWord);
      
      // Next word
      setTimeout(() => {
        const nextWord = getNextWord();
        setCurrentWord(nextWord);
        setChoices(generateChoices(nextWord));
        setShowTranslation(false);
        setWrongChoices([]);
      }, 1000);
    } else {
      // Wrong
      setWrongChoices([...wrongChoices, choice.hebrew]);
      toast.error("Try again!");
    }
  };

  const handleRate = async (rating) => {
    const existingWord = wordRatings.find(w => w.word === currentWord.hebrew);
    
    if (existingWord) {
      await updateWordMutation.mutateAsync({
        id: existingWord.id,
        data: { times_practiced: rating, mastered: rating >= 5 }
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

    if (rating >= 5) toast.success("Added to Fluent folder! 🎉");
    
    // Generate sentences
    generateSentences(currentWord);
  };

  const generateSentences = async (word) => {
    setLoadingSentences(true);
    setSentenceChecks({});
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 3 simple example sentences using the Hebrew word "${word.hebrew}" (${word.transliteration}) which means "${word.meaning}".
        Return ONLY the transliterated Hebrew (not Hebrew letters), with English translation.
        For each sentence, list ALL the words with their meanings.`,
        response_json_schema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  transliterated: { type: "string" },
                  english: { type: "string" },
                  words: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string" },
                        meaning: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      setGeneratedSentences(result.sentences);
    } catch (e) {
      console.error(e);
    }
    setLoadingSentences(false);
  };

  const addWordToBackpack = async (word, meaning) => {
    const exists = wordRatings.find(w => w.phonetic?.toLowerCase() === word.toLowerCase());
    if (exists) {
      toast.info("Already in backpack!");
      return;
    }
    await createWordMutation.mutateAsync({
      word: word,
      translation: meaning,
      phonetic: word,
      category: "wordbank",
      times_practiced: 1,
      mastered: false,
    });
    toast.success(`"${word}" added to backpack! 🎒`);
  };

  const moveToNextWord = () => {
    setGeneratedSentences(null);
    setSentenceChecks({});
    const nextWord = getNextWord();
    setCurrentWord(nextWord);
    setShowTranslation(false);
  };

  const needPhrase = currentWord ? needPhrases[currentWord.category] : null;

  // INTRO SCREEN
  if (gamePhase === "intro") {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
        <div className="text-center mb-6">
          <motion.span 
            className="text-8xl mb-4 block"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            👶
          </motion.span>
          <h2 className="text-3xl font-bold text-white mb-2">
            Hi! I'm {avatarName}!
          </h2>
          <p className="text-white/80 text-xl mb-4">
            Will you be my babysitter and learn Hebrew with me? 🍼
          </p>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
            <Star className="w-6 h-6 text-yellow-400" />
            Your Mission:
          </h3>
          <ul className="text-white/80 space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-2xl">📚</span>
              <span>Rate <strong>100 Hebrew words</strong> from 1-5 based on your knowledge</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-2xl">👶</span>
              <span>I'll ask for things (water, food, sleep, play, bathroom) - choose the right picture!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-2xl">⭐</span>
              <span>Rate 5 = <strong>Fluent</strong> (word goes to your Fluent folder)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-2xl">📺</span>
              <span>After 100 words, unlock <strong>Hebrew TV</strong> and word games!</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setGamePhase("needs")}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-6 text-xl rounded-xl"
        >
          Let's Start Babysitting! 🚀
        </Button>
      </div>
    );
  }

  // WORD GAME PHASE (after 100 words)
  if (gamePhase === "wordgame") {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🎮 Word Game with {avatarName}</h2>
          <Button variant="ghost" onClick={() => setGamePhase("needs")} className="text-white/60">
            Back to Needs
          </Button>
        </div>

        {!currentWord && (
          <div className="text-center py-8">
            <p className="text-white/60">Loading word...</p>
          </div>
        )}

        {currentWord && !generatedSentences && !loadingSentences && (
          <div className="text-center mb-6">
            <div className="bg-white/10 rounded-2xl p-6 mb-4">
              <p className="text-4xl font-bold text-cyan-400 mb-2" dir="rtl">{currentWord.hebrew}</p>
              <p className="text-xl text-white/80">{currentWord.transliteration}</p>
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="text-white/40 text-sm mt-2"
              >
                {showTranslation ? (
                  <span className="text-green-400">= {currentWord.meaning}</span>
                ) : "(tap for meaning)"}
              </button>
            </div>

            <p className="text-white/60 mb-3">Rate your knowledge:</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <motion.button
                  key={num}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRate(num)}
                  className={`w-14 h-14 rounded-xl font-bold text-lg ${
                    num === 5 ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    : num >= 4 ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    : num >= 3 ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white"
                    : "bg-white/20 text-white/80"
                  }`}
                >
                  {num}{num === 5 && <span className="block text-xs">⭐</span>}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {loadingSentences && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
            <p className="text-white/60">Generating sentences...</p>
          </div>
        )}

        {generatedSentences && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h4 className="text-white/80 mb-3">📝 Check if you know all words (click unknowns to add):</h4>
            {generatedSentences.map((sentence, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setSentenceChecks({...sentenceChecks, [idx]: !sentenceChecks[idx]})}
                    className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      sentenceChecks[idx] ? "bg-green-500 border-green-500" : "border-white/30"
                    }`}
                  >
                    {sentenceChecks[idx] && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {sentence.transliterated.split(' ').map((word, widx) => {
                        const wordInfo = sentence.words?.find(w => 
                          w.word.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, '')
                        );
                        return (
                          <button
                            key={widx}
                            onClick={() => wordInfo && addWordToBackpack(wordInfo.word, wordInfo.meaning)}
                            className={`px-1 rounded ${
                              wordInfo ? "text-cyan-400 hover:bg-cyan-500/20 underline decoration-dotted" : "text-white/80"
                            }`}
                            title={wordInfo ? `Click to add: ${wordInfo.meaning}` : undefined}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-white/50 text-sm">{sentence.english}</p>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={moveToNextWord} className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-purple-500">
              Next Word →
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // NEEDS PHASE (main game)
  return (
    <div className="p-4">
      {/* Compact Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/60 text-xs">{totalRated}/100</span>
          <div className="flex gap-2 text-xs">
            <span className="text-green-400">⭐{counts.fluent}</span>
            <span className="text-yellow-400">📚{counts.learning}</span>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            animate={{ width: `${Math.min((totalRated / 100) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Unlock Buttons */}
      {canWatchTV && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={onWatchTV}
            className="flex items-center justify-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-2 rounded-lg text-white text-sm font-bold"
          >
            <Tv className="w-4 h-4" /> TV
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => { setCurrentWord(getNextWord()); setGamePhase("wordgame"); }}
            className="flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 rounded-lg text-white text-sm font-bold"
          >
            <Gamepad2 className="w-4 h-4" /> Game
          </motion.button>
        </div>
      )}

      {/* Baby Need */}
      {currentWord && needPhrase && (
        <div className="text-center mb-4">
          <motion.div
            key={currentWord.hebrew}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-4"
          >
            <span className="text-5xl">👶</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-cyan-400">{needPhrase.transliteration}</p>
                <Button variant="ghost" size="sm" onClick={() => playAudio(needPhrase.hebrew)} className="text-cyan-400 p-1 h-auto">
                  <Volume2 className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="text-white/40 text-xs"
                >
                  {showTranslation ? <span className="text-green-400">({needPhrase.meaning})</span> : "(?)" }
                </button>
              </div>
              <p className="text-yellow-400 font-bold text-lg">
                {currentWord.transliteration}
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="text-white/40 text-sm ml-2"
                >
                  {showTranslation && <span className="text-white/60">= {currentWord.meaning}</span>}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Picture Choices */}
      {choices.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {choices.map((choice) => {
            const isWrong = wrongChoices.includes(choice.hebrew);
            return (
              <motion.button
                key={choice.hebrew}
                whileHover={{ scale: isWrong ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => !isWrong && handleChoiceClick(choice)}
                disabled={isWrong}
                className={`relative p-3 rounded-xl border transition-all ${
                  isWrong 
                    ? "bg-red-500/20 border-red-500/50 opacity-50" 
                    : "bg-white/5 border-white/20 hover:border-cyan-400/50"
                }`}
              >
                <span className="text-4xl block">{choice.icon}</span>
                {isWrong && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-2 mb-3 text-xs">
        <a href={createPageUrl("Practice")} className="flex-1 py-2 bg-white/5 rounded-lg text-cyan-400 text-center hover:bg-white/10">📚 Words</a>
        <a href={createPageUrl("Videos")} className="flex-1 py-2 bg-white/5 rounded-lg text-purple-400 text-center hover:bg-white/10">📺 Videos</a>
        <a href={createPageUrl("Progress")} className="flex-1 py-2 bg-white/5 rounded-lg text-blue-400 text-center hover:bg-white/10">📖 Lessons</a>
        <a href={createPageUrl("Store")} className="flex-1 py-2 bg-white/5 rounded-lg text-yellow-400 text-center hover:bg-white/10">🏪 Store</a>
        <button onClick={() => setBackpackOpen(true)} className="flex-1 py-2 bg-white/5 rounded-lg text-amber-400 text-center hover:bg-white/10">🎒</button>
      </div>

      {/* Backpack Dialog */}
      <Dialog open={backpackOpen} onOpenChange={setBackpackOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Backpack className="w-6 h-6 text-amber-400" />
              My Backpack
            </DialogTitle>
          </DialogHeader>
          
          {/* Words Section */}
          <div className="flex-1 overflow-hidden">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-green-400 mb-2">⭐ Fluent Words ({counts.fluent})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {wordRatings.filter(w => w.times_practiced >= 5).map((word) => (
                  <div key={word.id} className="bg-green-500/10 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-cyan-400">{word.phonetic || word.word}</span>
                    <span className="text-white/60 text-sm">{word.translation}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">📚 Learning ({counts.learning})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {wordRatings.filter(w => w.times_practiced > 0 && w.times_practiced < 5).map((word) => (
                  <div key={word.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-cyan-400">{word.phonetic || word.word}</span>
                    <span className="text-white/60 text-sm">{word.translation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Videos/Games Section */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-semibold text-white/60 mb-2">🎁 Unlocked Rewards</h4>
            {canWatchTV ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => { setBackpackOpen(false); onWatchTV(); }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Tv className="w-4 h-4 mr-1" /> Hebrew TV
                </Button>
                <Button
                  onClick={() => { setBackpackOpen(false); setCurrentWord(getNextWord()); setGamePhase("wordgame"); }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Gamepad2 className="w-4 h-4 mr-1" /> Word Game
                </Button>
              </div>
            ) : (
              <p className="text-white/40 text-sm">Rate {100 - totalRated} more words to unlock!</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}