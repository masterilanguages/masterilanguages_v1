import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Volume2 } from "lucide-react";

const activityData = {
  supermarket: {
    background: "from-green-100 to-emerald-100",
    scenarios: [
      { scene: "🛒 At the entrance", question: "How do you say 'shopping cart'?", hebrew: "עגלת קניות", phonetic: "agalat kniyot", options: ["agalat kniyot", "sal kniyot", "kli kniyot"], correct: 0 },
      { scene: "🍎 Fruit section", question: "Ask for apples", hebrew: "אני רוצה תפוחים", phonetic: "ani rotze tapuchim", options: ["ani rotze tapuchim", "ani ohev tapuchim", "tapuchim bevakasha"], correct: 0 },
      { scene: "💰 At checkout", question: "How much does it cost?", hebrew: "כמה זה עולה?", phonetic: "kama ze ole?", options: ["ma hashem?", "kama ze ole?", "eifo ze?"], correct: 1 },
    ]
  },
  gym: {
    background: "from-orange-100 to-red-100",
    scenarios: [
      { scene: "💪 Weight room", question: "How do you say 'arm'?", hebrew: "זרוע", phonetic: "zro'a", options: ["zro'a", "regel", "guf"], correct: 0 },
      { scene: "🏃 Treadmill", question: "How do you say 'leg'?", hebrew: "רגל", phonetic: "regel", options: ["yad", "regel", "rosh"], correct: 1 },
      { scene: "🧘 Yoga room", question: "How do you say 'body'?", hebrew: "גוף", phonetic: "guf", options: ["guf", "nefesh", "lev"], correct: 0 },
    ]
  },
  synagogue: {
    background: "from-blue-100 to-indigo-100",
    scenarios: [
      { scene: "🕯️ Shabbat candles", question: "Blessing for candles starts with:", hebrew: "ברוך אתה", phonetic: "baruch ata", options: ["shema yisrael", "baruch ata", "adon olam"], correct: 1 },
      { scene: "📜 Torah reading", question: "How do you say 'peace'?", hebrew: "שלום", phonetic: "shalom", options: ["shalom", "toda", "bevakasha"], correct: 0 },
      { scene: "🙏 Prayer time", question: "Shema Yisrael means:", hebrew: "שמע ישראל", phonetic: "Hear O Israel", options: ["Hear O Israel", "Peace be upon you", "Thank God"], correct: 0 },
    ]
  },
  shabbat_dinner: {
    background: "from-purple-100 to-violet-100",
    scenarios: [
      { scene: "🍷 Kiddush", question: "Blessing over wine:", hebrew: "בורא פרי הגפן", phonetic: "borei pri hagafen", options: ["hamotzi lechem", "borei pri hagafen", "shehakol"], correct: 1 },
      { scene: "🍞 Challah", question: "Blessing over bread:", hebrew: "המוציא לחם", phonetic: "hamotzi lechem", options: ["hamotzi lechem", "mezonot", "pri ha'etz"], correct: 0 },
      { scene: "👨‍👩‍👧‍👦 Family time", question: "How do you say 'family'?", hebrew: "משפחה", phonetic: "mishpacha", options: ["chaverim", "mishpacha", "yeladim"], correct: 1 },
    ]
  },
  meet_moroccan: {
    background: "from-pink-100 to-rose-100",
    scenarios: [
      { scene: "👋 Introduction", question: "How do you say 'nice to meet you'?", hebrew: "נעים להכיר", phonetic: "na'im lehakir", options: ["na'im lehakir", "ma nishma", "toda raba"], correct: 0 },
      { scene: "💬 Conversation", question: "Where are you from?", hebrew: "מאיפה את?", phonetic: "me'eifo at?", options: ["ma shlomech?", "me'eifo at?", "ma at osa?"], correct: 1 },
      { scene: "❤️ Compliment", question: "You are beautiful:", hebrew: "את יפה", phonetic: "at yafa", options: ["at yafa", "at tova", "at gedola"], correct: 0 },
    ]
  },
  mall: {
    background: "from-cyan-100 to-blue-100",
    scenarios: [
      { scene: "👕 Clothing store", question: "How do you say 'shirt'?", hebrew: "חולצה", phonetic: "chultza", options: ["chultza", "michansayim", "na'alayim"], correct: 0 },
      { scene: "💳 Payment", question: "I want to pay:", hebrew: "אני רוצה לשלם", phonetic: "ani rotze leshalem", options: ["ani rotze leshalem", "ani rotze lalechet", "ani rotze le'echol"], correct: 0 },
      { scene: "🛍️ Bags", question: "Do you have a bag?", hebrew: "יש לך שקית?", phonetic: "yesh lecha sakit?", options: ["yesh lecha kesef?", "yesh lecha sakit?", "yesh lecha zman?"], correct: 1 },
    ]
  },
  meet_blonde: {
    background: "from-yellow-100 to-amber-100",
    scenarios: [
      { scene: "☕ Coffee shop", question: "Can I buy you coffee?", hebrew: "אפשר לקנות לך קפה?", phonetic: "efshar liknot lach kafe?", options: ["efshar liknot lach kafe?", "ma at shota?", "eifo hakafe?"], correct: 0 },
      { scene: "📱 Phone number", question: "What's your number?", hebrew: "מה המספר שלך?", phonetic: "ma hamispar shelach?", options: ["ma hashem shelach?", "ma hamispar shelach?", "ma hakvisa shelach?"], correct: 1 },
      { scene: "📅 Date", question: "Want to meet tomorrow?", hebrew: "רוצה להיפגש מחר?", phonetic: "rotza lehipagesh machar?", options: ["rotza lehipagesh machar?", "rotza lalechet hayom?", "rotza ochel?"], correct: 0 },
    ]
  },
  breakup: {
    background: "from-gray-100 to-slate-100",
    scenarios: [
      { scene: "💔 Sad moment", question: "I'm sorry:", hebrew: "אני מצטער", phonetic: "ani mitsta'er", options: ["ani mitsta'er", "ani same'ach", "ani ayef"], correct: 0 },
      { scene: "😢 Feelings", question: "I feel sad:", hebrew: "אני עצוב", phonetic: "ani atzuv", options: ["ani atzuv", "ani sameach", "ani koes"], correct: 0 },
      { scene: "🌅 Moving on", question: "Everything will be okay:", hebrew: "הכל יהיה בסדר", phonetic: "hakol yihiye beseder", options: ["hakol yihiye beseder", "lo yodea", "ein li koach"], correct: 0 },
    ]
  },
  journaling: {
    background: "from-teal-100 to-green-100",
    scenarios: [
      { scene: "📝 Writing", question: "How do you say 'I think'?", hebrew: "אני חושב", phonetic: "ani choshev", options: ["ani choshev", "ani yodea", "ani margish"], correct: 0 },
      { scene: "🧠 Reflection", question: "I learned:", hebrew: "למדתי", phonetic: "lamadeti", options: ["lamadeti", "shachachti", "histakalti"], correct: 0 },
      { scene: "🎯 Goals", question: "I want to improve:", hebrew: "אני רוצה להשתפר", phonetic: "ani rotze lehishtaper", options: ["ani rotze lehishtaper", "ani rotze lishon", "ani rotze le'echol"], correct: 0 },
    ]
  },
  choose_girlfriend: {
    background: "from-red-100 to-pink-100",
    scenarios: [
      { scene: "💕 Decision", question: "I love you:", hebrew: "אני אוהב אותך", phonetic: "ani ohev otach", options: ["ani ohev otach", "ani rotze otach", "ani tzarich otach"], correct: 0 },
      { scene: "💍 Commitment", question: "Will you be my girlfriend?", hebrew: "תהיי החברה שלי?", phonetic: "tihiyi hachavera sheli?", options: ["tihiyi hachavera sheli?", "at yafa", "boee iti"], correct: 0 },
      { scene: "🌹 Romance", question: "You make me happy:", hebrew: "את משמחת אותי", phonetic: "at mesamachat oti", options: ["at mesamachat oti", "at yafa", "toda raba"], correct: 0 },
    ]
  },
};

export default function ActivityExperience({ activity, onComplete, onExit }) {
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const data = activityData[activity.id] || activityData.supermarket;
  const scenario = data.scenarios[currentScene];
  const isLastScene = currentScene === data.scenarios.length - 1;

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === scenario.correct) {
      setScore(s => s + 1);
    }
  };

  const nextScene = () => {
    if (isLastScene) {
      onComplete();
    } else {
      setCurrentScene(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${data.background} p-4 md:p-8`}>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onExit} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Exit
        </Button>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{activity.name}</h2>
            <span className="text-sm text-gray-500">{currentScene + 1}/{data.scenarios.length}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">{scenario.scene.split(' ')[0]}</div>
                <p className="text-gray-600">{scenario.scene.split(' ').slice(1).join(' ')}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                <p className="text-lg font-medium text-gray-800 mb-2">{scenario.question}</p>
                <p className="text-2xl font-bold text-violet-600" dir="rtl">{scenario.hebrew}</p>
                <p className="text-gray-500 mt-1">{scenario.phonetic}</p>
              </div>

              <div className="space-y-3">
                {scenario.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => !showResult && handleAnswer(idx)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      showResult
                        ? idx === scenario.correct
                          ? 'bg-green-100 border-green-500'
                          : idx === selectedAnswer
                            ? 'bg-red-100 border-red-500'
                            : 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {showResult && idx === scenario.correct && <Check className="w-5 h-5 text-green-600" />}
                      {showResult && idx === selectedAnswer && idx !== scenario.correct && <X className="w-5 h-5 text-red-600" />}
                    </div>
                  </button>
                ))}
              </div>

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Button onClick={nextScene} className="w-full bg-gradient-to-r from-violet-500 to-blue-500">
                    {isLastScene ? `Complete (${score}/${data.scenarios.length} correct)` : 'Next'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}