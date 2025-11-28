import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Users, ShoppingBag, Heart, BookOpen, Lock, Check, Coins, ArrowLeft, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

const activities = [
  { id: "supermarket", name: "Supermarket", icon: ShoppingCart, gradient: "from-green-500 to-emerald-500", cost: 50, minAge: 5 },
  { id: "gym", name: "Gym", icon: Dumbbell, gradient: "from-orange-500 to-red-500", cost: 75, minAge: 12, unlockReq: { activity: "supermarket", count: 3 } },
  { id: "synagogue", name: "Synagogue", icon: Church, gradient: "from-blue-500 to-indigo-500", cost: 100, minAge: 8 },
  { id: "shabbat_dinner", name: "Shabbat Dinner", icon: UtensilsCrossed, gradient: "from-purple-500 to-violet-500", cost: 150, minAge: 16, unlockReq: { activity: "synagogue", count: 3, item: "tuxedo" } },
  { id: "meet_moroccan", name: "Moroccan Date", icon: Heart, gradient: "from-pink-500 to-rose-500", cost: 100, minAge: 18, unlockReq: { activity: "shabbat_dinner", count: 1 } },
  { id: "mall", name: "Shopping Mall", icon: ShoppingBag, gradient: "from-cyan-500 to-blue-500", cost: 75, minAge: 10 },
  { id: "meet_blonde", name: "Mall Date", icon: Heart, gradient: "from-yellow-500 to-amber-500", cost: 100, minAge: 18, unlockReq: { activity: "mall", count: 1 } },
  { id: "journaling", name: "Journaling", icon: BookOpen, gradient: "from-teal-500 to-green-500", cost: 50, minAge: 14, unlockReq: { bothDates: true } },
  { id: "choose_partner", name: "Choose Partner", icon: Users, gradient: "from-red-500 to-pink-500", cost: 200, minAge: 21, unlockReq: { bothDates: true } },
];

const activityData = {
  supermarket: {
    scenarios: [
      { scene: "🛒", question: "How do you say 'shopping cart'?", hebrew: "עגלת קניות", phonetic: "agalat kniyot", options: ["agalat kniyot", "sal kniyot", "kli kniyot"], correct: 0 },
      { scene: "🍎", question: "Ask for apples", hebrew: "אני רוצה תפוחים", phonetic: "ani rotze tapuchim", options: ["ani rotze tapuchim", "ani ohev tapuchim", "tapuchim bevakasha"], correct: 0 },
      { scene: "💰", question: "How much does it cost?", hebrew: "כמה זה עולה?", phonetic: "kama ze ole?", options: ["ma hashem?", "kama ze ole?", "eifo ze?"], correct: 1 },
    ]
  },
  gym: {
    scenarios: [
      { scene: "💪", question: "How do you say 'arm'?", hebrew: "זרוע", phonetic: "zro'a", options: ["zro'a", "regel", "guf"], correct: 0 },
      { scene: "🏃", question: "How do you say 'leg'?", hebrew: "רגל", phonetic: "regel", options: ["yad", "regel", "rosh"], correct: 1 },
      { scene: "🧘", question: "How do you say 'body'?", hebrew: "גוף", phonetic: "guf", options: ["guf", "nefesh", "lev"], correct: 0 },
    ]
  },
  synagogue: {
    scenarios: [
      { scene: "🕯️", question: "Blessing for candles starts with:", hebrew: "ברוך אתה", phonetic: "baruch ata", options: ["shema yisrael", "baruch ata", "adon olam"], correct: 1 },
      { scene: "📜", question: "How do you say 'peace'?", hebrew: "שלום", phonetic: "shalom", options: ["shalom", "toda", "bevakasha"], correct: 0 },
      { scene: "🙏", question: "Shema Yisrael means:", hebrew: "שמע ישראל", options: ["Hear O Israel", "Peace be upon you", "Thank God"], correct: 0 },
    ]
  },
  shabbat_dinner: {
    scenarios: [
      { scene: "🍷", question: "Blessing over wine:", hebrew: "בורא פרי הגפן", phonetic: "borei pri hagafen", options: ["hamotzi lechem", "borei pri hagafen", "shehakol"], correct: 1 },
      { scene: "🍞", question: "Blessing over bread:", hebrew: "המוציא לחם", phonetic: "hamotzi lechem", options: ["hamotzi lechem", "mezonot", "pri ha'etz"], correct: 0 },
      { scene: "👨‍👩‍👧‍👦", question: "How do you say 'family'?", hebrew: "משפחה", phonetic: "mishpacha", options: ["chaverim", "mishpacha", "yeladim"], correct: 1 },
    ]
  },
  meet_moroccan: {
    scenarios: [
      { scene: "👋", question: "How do you say 'nice to meet you'?", hebrew: "נעים להכיר", phonetic: "na'im lehakir", options: ["na'im lehakir", "ma nishma", "toda raba"], correct: 0 },
      { scene: "💬", question: "Where are you from?", hebrew: "מאיפה את?", phonetic: "me'eifo at?", options: ["ma shlomech?", "me'eifo at?", "ma at osa?"], correct: 1 },
      { scene: "❤️", question: "You are beautiful:", hebrew: "את יפה", phonetic: "at yafa", options: ["at yafa", "at tova", "at gedola"], correct: 0 },
    ]
  },
  mall: {
    scenarios: [
      { scene: "👕", question: "How do you say 'shirt'?", hebrew: "חולצה", phonetic: "chultza", options: ["chultza", "michansayim", "na'alayim"], correct: 0 },
      { scene: "💳", question: "I want to pay:", hebrew: "אני רוצה לשלם", phonetic: "ani rotze leshalem", options: ["ani rotze leshalem", "ani rotze lalechet", "ani rotze le'echol"], correct: 0 },
      { scene: "🛍️", question: "Do you have a bag?", hebrew: "יש לך שקית?", phonetic: "yesh lecha sakit?", options: ["yesh lecha kesef?", "yesh lecha sakit?", "yesh lecha zman?"], correct: 1 },
    ]
  },
  meet_blonde: {
    scenarios: [
      { scene: "☕", question: "Can I buy you coffee?", hebrew: "אפשר לקנות לך קפה?", phonetic: "efshar liknot lach kafe?", options: ["efshar liknot lach kafe?", "ma at shota?", "eifo hakafe?"], correct: 0 },
      { scene: "📱", question: "What's your number?", hebrew: "מה המספר שלך?", phonetic: "ma hamispar shelach?", options: ["ma hashem shelach?", "ma hamispar shelach?", "ma hakvisa shelach?"], correct: 1 },
      { scene: "📅", question: "Want to meet tomorrow?", hebrew: "רוצה להיפגש מחר?", phonetic: "rotza lehipagesh machar?", options: ["rotza lehipagesh machar?", "rotza lalechet hayom?", "rotza ochel?"], correct: 0 },
    ]
  },
  journaling: {
    scenarios: [
      { scene: "📝", question: "How do you say 'I think'?", hebrew: "אני חושב", phonetic: "ani choshev", options: ["ani choshev", "ani yodea", "ani margish"], correct: 0 },
      { scene: "🧠", question: "I learned:", hebrew: "למדתי", phonetic: "lamadeti", options: ["lamadeti", "shachachti", "histakalti"], correct: 0 },
      { scene: "🎯", question: "I want to improve:", hebrew: "אני רוצה להשתפר", phonetic: "ani rotze lehishtaper", options: ["ani rotze lehishtaper", "ani rotze lishon", "ani rotze le'echol"], correct: 0 },
    ]
  },
  choose_partner: {
    scenarios: [
      { scene: "💕", question: "I love you:", hebrew: "אני אוהב אותך", phonetic: "ani ohev otach", options: ["ani ohev otach", "ani rotze otach", "ani tzarich otach"], correct: 0 },
      { scene: "💍", question: "Will you be mine?", hebrew: "תהיי שלי?", phonetic: "tihiyi sheli?", options: ["tihiyi sheli?", "at yafa", "boee iti"], correct: 0 },
      { scene: "🌹", question: "You make me happy:", hebrew: "את משמחת אותי", phonetic: "at mesamachat oti", options: ["at mesamachat oti", "at yafa", "toda raba"], correct: 0 },
    ]
  },
};

export default function Activities() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('id');
  const queryClient = useQueryClient();
  
  const [activeExperience, setActiveExperience] = useState(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      if (coins.length === 0) {
        return await base44.entities.UserCoins.create({ coins: 100000000, unlocked_items: [], equipped_item: null });
      }
      return coins[0];
    },
  });

  const { data: activityProgress = [] } = useQuery({
    queryKey: ['activityProgress'],
    queryFn: () => base44.entities.ActivityProgress.list(),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, data }) => {
      const existing = activityProgress.find(p => p.activity_id === activityId);
      if (existing) {
        return base44.entities.ActivityProgress.update(existing.id, data);
      }
      return base44.entities.ActivityProgress.create({ activity_id: activityId, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activityProgress'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  useEffect(() => {
    if (activityId) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        startActivity(activity);
      }
    }
  }, [activityId]);

  const getProgress = (id) => activityProgress.find(p => p.activity_id === id);
  const coins = userCoins?.coins || 0;
  const unlockedItems = userCoins?.unlocked_items || [];

  const isUnlocked = (activity) => {
    if (!activity.unlockReq) return true;
    const req = activity.unlockReq;
    
    if (req.bothDates) {
      const moroccan = getProgress("meet_moroccan");
      const blonde = getProgress("meet_blonde");
      return (moroccan?.completions || 0) >= 1 && (blonde?.completions || 0) >= 1;
    }
    
    if (req.activity) {
      const progress = getProgress(req.activity);
      const hasCompletions = (progress?.completions || 0) >= req.count;
      const hasItem = req.item ? unlockedItems.includes(req.item) : true;
      return hasCompletions && hasItem;
    }
    
    return true;
  };

  const startActivity = (activity) => {
    const currentAge = userProfile?.age_level || 5;
    if (currentAge < activity.minAge) {
      toast.error(`Your avatar needs to be ${activity.minAge}+ years old`);
      return;
    }
    if (!isUnlocked(activity)) {
      toast.error("This activity is locked!");
      return;
    }
    if (coins < activity.cost) {
      toast.error("Not enough coins!");
      return;
    }
    updateCoinsMutation.mutate({ coins: coins - activity.cost });
    setActiveExperience(activity);
    setCurrentScene(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAiFeedback("");
  };

  const handleAnswer = async (index) => {
    const data = activityData[activeExperience.id];
    const scenario = data.scenarios[currentScene];
    
    setSelectedAnswer(index);
    setShowResult(true);
    
    const isCorrect = index === scenario.correct;
    if (isCorrect) {
      setScore(s => s + 1);
    }

    // Get AI feedback
    setLoadingFeedback(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `The user answered "${scenario.options[index]}" to the question "${scenario.question}". The correct answer is "${scenario.options[scenario.correct]}" (${scenario.hebrew}). Give a brief, encouraging feedback in 1-2 sentences. If wrong, explain why the correct answer is right. Keep it friendly and helpful.`,
        response_json_schema: {
          type: "object",
          properties: { feedback: { type: "string" } }
        }
      });
      setAiFeedback(result.feedback);
    } catch (e) {
      setAiFeedback(isCorrect ? "Great job! 🎉" : `The correct answer is "${scenario.options[scenario.correct]}"`);
    }
    setLoadingFeedback(false);
  };

  const nextScene = () => {
    const data = activityData[activeExperience.id];
    if (currentScene < data.scenarios.length - 1) {
      setCurrentScene(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setAiFeedback("");
    } else {
      completeActivity();
    }
  };

  const completeActivity = () => {
    const current = getProgress(activeExperience.id);
    const newCompletions = (current?.completions || 0) + 1;
    
    updateActivityMutation.mutate({
      activityId: activeExperience.id,
      data: { completions: newCompletions, unlocked: true }
    });

    // Award XP and potentially age up
    const xpEarned = score * 50;
    const newXp = (userProfile?.xp || 0) + xpEarned;
    const xpPerLevel = 1000;
    const levelsGained = Math.floor(newXp / xpPerLevel) - Math.floor((userProfile?.xp || 0) / xpPerLevel);
    
    if (levelsGained > 0) {
      const newAge = Math.min((userProfile?.age_level || 5) + levelsGained, 25);
      updateProfileMutation.mutate({ xp: newXp, age_level: newAge });
      toast.success(`🎂 Your avatar grew to ${newAge} years old!`);
    } else {
      updateProfileMutation.mutate({ xp: newXp });
    }

    toast.success(`Completed! +${xpEarned} XP`);
    setActiveExperience(null);
  };

  if (activeExperience) {
    const data = activityData[activeExperience.id];
    const scenario = data?.scenarios[currentScene];
    
    if (!scenario) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => setActiveExperience(null)} className="text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{activeExperience.name}</h2>
              <span className="text-white/60">{currentScene + 1}/{data.scenarios.length}</span>
            </div>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{scenario.scene}</div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6 text-center">
              <p className="text-lg font-medium text-white mb-2">{scenario.question}</p>
              <p className="text-2xl font-bold text-cyan-400" dir="rtl">{scenario.hebrew}</p>
              {scenario.phonetic && <p className="text-white/60 mt-1">{scenario.phonetic}</p>}
            </div>

            <div className="space-y-3">
              {scenario.options.map((option, idx) => (
                <motion.button
                  key={idx}
                  whileHover={!showResult ? { scale: 1.02 } : {}}
                  onClick={() => !showResult && handleAnswer(idx)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    showResult
                      ? idx === scenario.correct
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : idx === selectedAnswer
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-white/5 border-white/10 text-white/50'
                      : 'bg-white/5 border-white/20 text-white hover:border-cyan-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {showResult && idx === scenario.correct && <Check className="w-5 h-5" />}
                  </div>
                </motion.button>
              ))}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                {loadingFeedback ? (
                  <div className="flex items-center gap-2 text-white/60 mb-4">
                    <Brain className="w-5 h-5 animate-pulse" /> AI analyzing...
                  </div>
                ) : aiFeedback && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <p className="text-white/90">{aiFeedback}</p>
                    </div>
                  </div>
                )}
                
                <Button onClick={nextScene} className="w-full bg-gradient-to-r from-cyan-500 to-purple-500">
                  {currentScene < data.scenarios.length - 1 ? 'Next Question' : `Complete (${score}/${data.scenarios.length})`}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={coins} onBuyCoins={() => {}} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Life Activities</h1>
            <p className="text-white/60">Complete activities to grow your avatar</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => {
            const progress = getProgress(activity.id);
            const unlocked = isUnlocked(activity);
            const currentAge = userProfile?.age_level || 5;
            const ageLocked = currentAge < activity.minAge;
            const canAccess = unlocked && !ageLocked;

            return (
              <motion.div
                key={activity.id}
                whileHover={canAccess ? { scale: 1.02 } : {}}
                onClick={() => canAccess && startActivity(activity)}
                className={`relative overflow-hidden rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                  canAccess 
                    ? 'border-white/20 bg-white/5 hover:border-cyan-400/50' 
                    : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                {!canAccess && (
                  <div className="absolute top-3 left-3">
                    <Lock className="w-5 h-5 text-white/60" />
                  </div>
                )}

                {(progress?.completions || 0) > 0 && (
                  <div className="absolute top-3 right-3 bg-green-500/80 rounded-lg px-2 py-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">{progress.completions}x</span>
                  </div>
                )}

                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center shadow-lg mb-4`}>
                  <activity.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-white font-bold text-lg mb-1">{activity.name}</h3>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">{activity.cost}</span>
                  </div>
                  {ageLocked && (
                    <span className="text-xs text-white/50">Age {activity.minAge}+</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}