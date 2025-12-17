import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Heart, ShoppingBag, BookOpen, Users, Play, Trophy, Sparkles, ArrowRight, Flame, Briefcase, School, Baby, Star, Clock, ChevronRight, X, Home as HomeIcon, Video, Library, Book, Calendar, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import TranslatorWidget from "../components/TranslatorWidget";

import ActivityCard from "../components/game/ActivityCard";
import TimelineBar from "../components/game/TimelineBar";
import BabyGame from "../components/game/BabyGame";
import AvatarMenu from "../components/game/AvatarMenu";
import HebrewChatWidget from "../components/home/HebrewChatWidget";
import DailySongCard from "../components/home/DailySongCard";


const activities = [
  { id: "supermarket", name: "Supermarket", icon: ShoppingCart, gradient: "from-green-500 to-emerald-500", cost: 50, minAge: 5, description: "Buy groceries in Hebrew" },
  { id: "sports", name: "Sports Club", icon: Trophy, gradient: "from-amber-500 to-yellow-500", cost: 60, minAge: 8, description: "Play and learn sports terms" },
  { id: "gym", name: "Gym", icon: Dumbbell, gradient: "from-orange-500 to-red-500", cost: 75, minAge: 16, description: "Learn body vocabulary", unlockReq: { activity: "sports", count: 2 } },
  { id: "synagogue", name: "Synagogue", icon: Church, gradient: "from-blue-500 to-indigo-500", cost: 100, minAge: 8, description: "Learn important prayers" },
  { id: "job", name: "Get a Job", icon: Briefcase, gradient: "from-slate-500 to-gray-600", cost: 100, minAge: 18, description: "Work and earn extra coins" },
  { id: "shabbat_dinner", name: "Shabbat Dinner", icon: UtensilsCrossed, gradient: "from-purple-500 to-violet-500", cost: 150, minAge: 16, description: "Traditional dinner", unlockReq: { activity: "synagogue", count: 3, item: "tuxedo" } },
  { id: "meet_moroccan", name: "Moroccan Date", icon: Heart, gradient: "from-pink-500 to-rose-500", cost: 100, minAge: 18, description: "Meet someone special", unlockReq: { activity: "shabbat_dinner", count: 1 } },
  { id: "mall", name: "Shopping Mall", icon: ShoppingBag, gradient: "from-cyan-500 to-blue-500", cost: 75, minAge: 10, description: "Shop and learn" },
  { id: "meet_blonde", name: "Mall Date", icon: Heart, gradient: "from-yellow-500 to-amber-500", cost: 100, minAge: 18, description: "Another encounter", unlockReq: { activity: "mall", count: 1 } },
  { id: "journaling", name: "Journaling", icon: BookOpen, gradient: "from-teal-500 to-green-500", cost: 50, minAge: 14, description: "Self development", unlockReq: { bothDates: true } },
  { id: "choose_partner", name: "Choose Partner", icon: Users, gradient: "from-red-500 to-pink-500", cost: 200, minAge: 21, description: "Make your choice", unlockReq: { bothDates: true } },
];

const storeItems = [
  { id: "tuxedo", name: "Tuxedo", emoji: "🤵", price: 300 },
  { id: "tennis_racquet", name: "Tennis Racquet", emoji: "🎾", price: 100 },
  { id: "soccer_ball", name: "Soccer Ball", emoji: "⚽", price: 100 },
  { id: "crown", name: "Golden Crown", emoji: "👑", price: 300 },
];

const levels = [
  { 
    id: 1, 
    name: "Level 1", 
    subtitle: "Baby Steps",
    icon: Baby, 
    gradient: "from-pink-500 to-rose-500",
    activities: [
      { id: "level1_world", name: "🎮 Play in Level 1 World (4 zones)", duration: "5 minutes", icon: "🌍", page: "Level1World" },
      { id: "baby_words", name: "Help baby learn 50 first words and learn sentences", duration: "10 minutes", icon: "👶", page: "BabyVideos" },
      { id: "colors", name: "Learn the colors", duration: "5 minutes", icon: "🎨", page: "ColorsLesson" },
      { id: "body_parts", name: "Learn body parts", duration: "5 minutes", icon: "🦵", page: "BodyPartsLesson" },
      { id: "days", name: "Learn days of the week", duration: "5 minutes", icon: "📅", page: "DaysLesson" },
      { id: "months", name: "Learn months of the year", duration: "5 minutes", icon: "🗓️", page: "MonthsLesson" },
      { id: "blessing", name: "Learn a Jewish blessing in Hebrew", duration: "5 minutes", icon: "✡️", page: "Progress" },
      { id: "youtube", name: "Watch Youtube video", duration: "1 hour", icon: "📺", page: "BabyVideos" },
    ]
  },
  { id: 2, name: "Level 2", subtitle: "Growing Up", icon: Star, gradient: "from-amber-500 to-orange-500", activities: [] },
  { id: 3, name: "Level 3", subtitle: "Explorer", icon: Sparkles, gradient: "from-green-500 to-emerald-500", activities: [] },
  { id: 4, name: "Level 4", subtitle: "Adventurer", icon: Trophy, gradient: "from-blue-500 to-indigo-500", activities: [] },
  { id: 5, name: "Level 5", subtitle: "Master", icon: Star, gradient: "from-purple-500 to-violet-500", activities: [] },
];

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [buyCoinsDialog, setBuyCoinsDialog] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSpeed, setTimerSpeed] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  // Master user = admin role OR specific emails
  const isMasterUser = currentUser?.role === 'admin';

  const { data: userProfile, isLoading: profileLoading } = useQuery({
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

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
  });

  const { data: todoItems = [] } = useQuery({
    queryKey: ['todoItems'],
    queryFn: () => base44.entities.TodoItem.list(),
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todoItems'] }),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: () => base44.entities.UserProfile.delete(userProfile?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate(createPageUrl("AvatarSelect"));
    },
  });

  // Redirect to avatar selection if no profile
  useEffect(() => {
    if (!profileLoading && !userProfile) {
      navigate(createPageUrl("AvatarSelect"));
    }
  }, [userProfile, profileLoading, navigate]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (timerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= timerSpeed) {
            setTimerRunning(false);
            // Play baby song when timer ends
            const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
            audio.play().catch(() => {});
            toast.success("Time's up! 🎵 Great job learning!");
            return 0;
          }
          return prev - timerSpeed;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timer, timerSpeed]);

  const startTimer = (minutes) => {
    setTimer(minutes * 60);
    setTimerRunning(true);
    setTimerSpeed(1);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (activityId) => activityProgress.find(p => p.activity_id === activityId);
  const coins = userCoins?.coins || 0;
  const unlockedItems = userCoins?.unlocked_items || [];
  const equippedItem = storeItems.find(i => i.id === userCoins?.equipped_item);

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

  const buyCoins = (amount) => {
    updateCoinsMutation.mutate({ coins: coins + amount });
    toast.success(`Added ${amount.toLocaleString()} coins!`);
    setBuyCoinsDialog(false);
  };

  const handleToddlerNeedComplete = (need) => {
    // Award coins and XP
    const newXp = (userProfile?.xp || 0) + 10;
    const needsCompleted = (userProfile?.toddler_needs_completed || 0) + 1;
    
    // Check if should age up (every 20 needs = 1 year until age 5)
    const shouldAgeUp = needsCompleted % 20 === 0 && (userProfile?.age_level || 3) < 5;
    
    updateProfileMutation.mutate({
      xp: newXp,
      toddler_needs_completed: needsCompleted,
      age_level: shouldAgeUp ? (userProfile?.age_level || 3) + 1 : userProfile?.age_level,
    });
    
    updateCoinsMutation.mutate({ coins: coins + 15 });
    toast.success(`+15 coins, +10 XP! ${shouldAgeUp ? '🎉 Level up!' : ''}`);
  };

  const handleRestartLife = () => {
    // Delete all word ratings too for full reset
    updateProfileMutation.mutate({
      age_level: 3,
      xp: 0,
      toddler_needs_completed: 0,
      badges: [],
      total_words_learned: 0,
    });
    deleteProfileMutation.mutate();
    toast.success("Starting new life from the beginning!");
  };

  const handleChangeAvatar = () => {
    deleteProfileMutation.mutate();
  };

  const currentAge = userProfile?.age_level || 3;
  const isBaby = currentAge < 5;
  const hasDiaper = unlockedItems.includes("diaper");

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <GameHeader 
        profile={userProfile} 
        coins={coins} 
        onBuyCoins={() => setBuyCoinsDialog(true)} 
        onSelectLevel={setSelectedLevel}
      />
      
      <TimelineBar currentAge={currentAge} />

      {/* Quick Navigation */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-4 gap-2">
          <Link to={createPageUrl("Home")}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="w-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 text-white hover:from-purple-500/30 hover:to-pink-500/30 h-auto py-3 flex-col backdrop-blur-sm">
                <HomeIcon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Home</span>
              </Button>
            </motion.div>
          </Link>
          <Link to={createPageUrl("BabyVideos")}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="w-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50 text-white hover:from-blue-500/30 hover:to-cyan-500/30 h-auto py-3 flex-col backdrop-blur-sm">
                <Video className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Videos</span>
              </Button>
            </motion.div>
          </Link>
          <Link to={createPageUrl("Practice")}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="w-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 text-white hover:from-green-500/30 hover:to-emerald-500/30 h-auto py-3 flex-col backdrop-blur-sm">
                <BookOpen className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Practice</span>
              </Button>
            </motion.div>
          </Link>
          <Link to={createPageUrl("Library")}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="w-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50 text-white hover:from-amber-500/30 hover:to-orange-500/30 h-auto py-3 flex-col backdrop-blur-sm">
                <Library className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Library</span>
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Timer display */}
      {timer > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 right-4 z-50 bg-slate-800/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg"
        >
          <div className="text-center">
            <p className="text-white/60 text-xs mb-1">Time Left</p>
            <p className="text-2xl font-bold text-cyan-400">{formatTime(timer)}</p>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setTimerSpeed(1)}
                className={`px-2 py-1 rounded text-xs ${timerSpeed === 1 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                1x
              </button>
              <button
                onClick={() => setTimerSpeed(2)}
                className={`px-2 py-1 rounded text-xs ${timerSpeed === 2 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                2x
              </button>
              <button
                onClick={() => setTimerSpeed(10)}
                className={`px-2 py-1 rounded text-xs ${timerSpeed === 10 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                10x
              </button>
              <button
                onClick={() => { setTimer(0); setTimerRunning(false); }}
                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Show activity content OR levels */}
        {selectedActivity ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <button 
              onClick={() => { setSelectedActivity(null); setTimer(0); setTimerRunning(false); }}
              className="mb-6 text-white/60 hover:text-white flex items-center gap-2 mx-auto"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to levels
            </button>

            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Will you be my babysitter and learn Hebrew with me? 🍼
            </h2>

            <BabyGame 
              avatarName={userProfile?.avatar_name || 'Baby'}
              correctCount={userProfile?.toddler_needs_completed || 0}
              onCorrect={handleToddlerNeedComplete}
              onWatchTV={() => navigate(createPageUrl("BabyVideos"))}
            />
          </motion.div>
        ) : selectedLevel ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button 
              onClick={() => setSelectedLevel(null)}
              className="mb-6 text-white/60 hover:text-white flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to levels
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedLevel.gradient} flex items-center justify-center`}>
                {selectedLevel.icon && <selectedLevel.icon className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedLevel.name}</h2>
                <p className="text-white/60">{selectedLevel.subtitle}</p>
              </div>
            </div>

            {selectedLevel.activities?.length > 0 ? (
              <div className="space-y-3">
                {isMasterUser && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 mb-4">
                    <p className="text-yellow-400 text-sm font-medium">👑 Master Mode: All levels unlocked</p>
                  </div>
                )}
                {selectedLevel.activities
                  .map((activity) => ({
                    ...activity,
                    isCompleted: lessonProgress.find(lp => lp.lesson_name === activity.page && lp.completed)
                  }))
                  .sort((a, b) => (b.isCompleted ? 1 : 0) - (a.isCompleted ? 1 : 0))
                  .map((activity) => {

                  return (
                    <motion.button
                      key={activity.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // Parse duration to get minutes
                        const durationMatch = activity.duration.match(/(\d+)\s*(minute|hour)/i);
                        if (durationMatch) {
                          const amount = parseInt(durationMatch[1]);
                          const unit = durationMatch[2].toLowerCase();
                          const minutes = unit === 'hour' ? amount * 60 : amount;
                          startTimer(minutes);
                        }

                        if (activity.id === "baby_words") {
                          setSelectedActivity(activity);
                        } else {
                          navigate(createPageUrl(activity.page));
                        }
                      }}
                      className={`w-full ${activity.isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'} hover:bg-white/10 border hover:border-cyan-400/50 rounded-xl p-4 text-left transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        {activity.isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0" />
                        )}
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{activity.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-white/60 text-sm">
                            <Clock className="w-3 h-3" />
                            <span>{activity.duration}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/60">Coming soon!</p>
                <p className="text-white/40 text-sm mt-2">This level is being prepared for you.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Hebrew Chat Widget */}
            <div className="mb-6">
              <HebrewChatWidget 
                onComplete={() => {
                  updateCoinsMutation.mutate({ coins: coins + 50 });
                  toast.success("+50 coins! 🎉");
                }}
              />
            </div>

            {/* Daily Song Card */}
            <div className="mb-6">
              <DailySongCard />
            </div>

            {/* Today's Activities - Show at top when no level selected */}
            {!selectedLevel && levels[0].activities && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-3">Today's Activities</h2>
                <div className="space-y-2">
                  {levels[0].activities.slice(0, 10).map((activity, idx) => {
                    const isCompleted = lessonProgress.find(lp => lp.lesson_name === activity.page && lp.completed);
                    return (
                      <motion.button
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const durationMatch = activity.duration.match(/(\d+)\s*(minute|hour)/i);
                          if (durationMatch) {
                            const amount = parseInt(durationMatch[1]);
                            const unit = durationMatch[2].toLowerCase();
                            const minutes = unit === 'hour' ? amount * 60 : amount;
                            startTimer(minutes);
                          }

                          if (activity.id === "baby_words") {
                            setSelectedActivity(activity);
                          } else {
                            navigate(createPageUrl(activity.page));
                          }
                        }}
                        className={`w-full ${isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'} hover:bg-white/10 border hover:border-cyan-400/50 rounded-xl p-3 text-left transition-all`}
                      >
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0" />
                          )}
                          <span className="text-xl">{activity.icon}</span>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{activity.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-white/60 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{activity.duration}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/40" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dashboard Boxes - Only show when no level is selected */}
            {!selectedLevel && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-6">
                      {/* Videos Box */}
                      <Link to={createPageUrl("BabyVideos")}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-3 hover:border-blue-400/50 transition-all cursor-pointer h-full"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-4 h-4 text-blue-400" />
                            <h3 className="text-white font-bold text-sm">Videos</h3>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {[1, 2].map((i) => (
                              <div key={i} className="flex-1 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded flex items-center justify-center">
                                <Play className="w-4 h-4 text-white/60" />
                              </div>
                            ))}
                          </div>
                          <p className="text-blue-400 text-[10px]">Watch & learn →</p>
                        </motion.div>
                      </Link>

                      {/* Vocabulary Box */}
                      <Link to={createPageUrl("Backpack")}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-xl p-3 hover:border-amber-400/50 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                            <h3 className="text-white font-bold text-sm">Words</h3>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-center">
                              <p className="text-xl font-bold text-cyan-400">{wordRatings.length}</p>
                              <p className="text-white/60 text-[10px]">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-green-400">{wordRatings.filter(w => w.times_practiced >= 5).length}</p>
                              <p className="text-white/60 text-[10px]">Fluent</p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>

                      {/* Practice Box */}
                      <Link to={createPageUrl("Practice")}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-3 hover:border-green-400/50 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-green-400" />
                            <h3 className="text-white font-bold text-sm">Practice</h3>
                          </div>
                          <p className="text-green-400 text-xs">Study & review →</p>
                        </motion.div>
                      </Link>
                      </div>
                </>
              )}
          </>
        )}
      </div>

      {/* Buy Coins Dialog */}
      <Dialog open={buyCoinsDialog} onOpenChange={setBuyCoinsDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>💎 Buy Coins</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { coins: 1000, price: "$0.99", emoji: "💰" },
              { coins: 5000, price: "$3.99", emoji: "💎" },
              { coins: 15000, price: "$9.99", emoji: "👑" },
              { coins: 50000, price: "$24.99", emoji: "🏆" },
            ].map((pkg) => (
              <button
                key={pkg.coins}
                onClick={() => buyCoins(pkg.coins)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl hover:border-yellow-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{pkg.emoji}</span>
                  <span className="font-bold">{pkg.coins.toLocaleString()} Coins</span>
                </div>
                <span className="font-bold text-green-400">{pkg.price}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Menu */}
      <AvatarMenu
        open={avatarMenuOpen}
        onClose={() => setAvatarMenuOpen(false)}
        onChangeAvatar={handleChangeAvatar}
        onRestartLife={handleRestartLife}
        avatarName={userProfile?.avatar_name || 'Avatar'}
      />

      {/* Translator Widget */}
      <TranslatorWidget />
    </div>
  );
}