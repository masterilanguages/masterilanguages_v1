import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Heart, ShoppingBag, BookOpen, Users, Play, Trophy, Sparkles, ArrowRight, Flame, Briefcase, School, Baby, Star, ChevronRight, ChevronDown, X, Home as HomeIcon, Video, Library, Book, Calendar, Check, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import TranslatorWidget from "../components/TranslatorWidget";

import ActivityCard from "../components/game/ActivityCard";
import TimelineBar from "../components/game/TimelineBar";
import BabyGame from "../components/game/BabyGame";
import AvatarMenu from "../components/game/AvatarMenu";




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



export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [buyCoinsDialog, setBuyCoinsDialog] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSpeed, setTimerSpeed] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [showExtras, setShowExtras] = useState(false);


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
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: songProgress = [] } = useQuery({
    queryKey: ['songProgress'],
    queryFn: () => base44.entities.SongProgress.list(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: todoProgress = [] } = useQuery({
    queryKey: ['todoProgress'],
    queryFn: () => base44.entities.TodoProgress.list(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: days = [] } = useQuery({
    queryKey: ['days', userProfile?.language],
    queryFn: () => base44.entities.Day.filter({ language: userProfile?.language || 'hebrew' }),
    enabled: !!userProfile,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: dayProgress = [] } = useQuery({
    queryKey: ['dayProgress'],
    queryFn: () => base44.entities.DayProgress.list(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const toggleSubsectionMutation = useMutation({
    mutationFn: async ({ dayId, subsectionId, dayNumber }) => {
      const progress = dayProgress.find(p => p.day_id === dayId) || { day_id: dayId, day_number: dayNumber, subsections_completed: [] };
      const isCompleted = progress.subsections_completed?.includes(subsectionId);
      const newCompleted = isCompleted 
        ? progress.subsections_completed.filter(id => id !== subsectionId)
        : [...(progress.subsections_completed || []), subsectionId];
      
      if (progress.id) {
        await base44.entities.DayProgress.update(progress.id, { subsections_completed: newCompleted });
      } else {
        await base44.entities.DayProgress.create({ day_id: dayId, day_number: dayNumber, subsections_completed: newCompleted });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dayProgress'] }),
  });

  const updateDayMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Day.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Day updated!");
    },
  });

  const createDayMutation = useMutation({
    mutationFn: (data) => base44.entities.Day.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Day created!");
    },
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



  const [expandedDay, setExpandedDay] = useState(1);
  const [newSubsection, setNewSubsection] = useState({ name: "", duration: "", icon: "", page: "" });

  const currentDay = userProfile?.current_day || 1;
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  const isDayUnlocked = (dayNum) => isMasterUser || dayNum <= currentDay;
  const getDayProgress = (dayId) => dayProgress.find(p => p.day_id === dayId);

  const handleAddSubsection = (dayId) => {
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = [...(day.subsections || []), { 
      id: Date.now().toString(), 
      ...newSubsection 
    }];
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    setNewSubsection({ name: "", duration: "", icon: "", page: "" });
  };

  const handleDeleteSubsection = (dayId, subsectionId) => {
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = day.subsections.filter(s => s.id !== subsectionId);
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
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
          <Link to={createPageUrl("Backpack")}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="w-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50 text-white hover:from-amber-500/30 hover:to-orange-500/30 h-auto py-3 flex-col backdrop-blur-sm">
                <Library className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Backpack</span>
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
        {/* Show activity content */}
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
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Days</h2>
                <p className="text-white/60">Day {currentDay} of 100</p>
              </div>
              {isMasterUser && (
                <Button onClick={() => {
                  const nextDayNum = Math.max(...days.map(d => d.day_number), 0) + 1;
                  createDayMutation.mutate({
                    day_number: nextDayNum,
                    language: userProfile?.language || 'hebrew',
                    title: `Day ${nextDayNum}`,
                    subsections: []
                  });
                }} className="bg-green-500 hover:bg-green-600">
                  + Add Day
                </Button>
              )}
            </div>

            {sortedDays.map((day, idx) => {
              const unlocked = isDayUnlocked(day.day_number);
              const progress = getDayProgress(day.id);
              const isExpanded = expandedDay === day.day_number;

              const gradients = [
                "from-pink-500 to-rose-500",
                "from-amber-500 to-orange-500",
                "from-green-500 to-emerald-500",
                "from-blue-500 to-indigo-500",
                "from-purple-500 to-violet-500",
                "from-cyan-500 to-blue-500",
                "from-red-500 to-pink-500",
                "from-yellow-500 to-orange-500",
                "from-teal-500 to-green-500",
                "from-indigo-500 to-purple-500",
              ];
              const gradient = gradients[idx % gradients.length];

              return (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden ${
                    !unlocked ? 'opacity-50' : ''
                  }`}
                >
                  <button
                    onClick={() => unlocked && setExpandedDay(isExpanded ? null : day.day_number)}
                    disabled={!unlocked}
                    className={`w-full bg-gradient-to-r ${gradient} p-4 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          progress?.completed ? 'bg-white/30' : !unlocked ? 'bg-white/10' : 'bg-white/20'
                        }`}>
                          {progress?.completed ? (
                            <Check className="w-6 h-6 text-white" />
                          ) : !unlocked ? (
                            <Lock className="w-5 h-5 text-white/60" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-bold text-xl">{day.title || `Day ${day.day_number}`}</h3>
                          {day.description && <p className="text-white/80 text-sm">{day.description}</p>}
                        </div>
                      </div>
                      {unlocked && <ChevronDown className={`w-6 h-6 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 space-y-3">
                          {day.subsections?.map((subsection) => {
                            const isCompleted = progress?.subsections_completed?.includes(subsection.id);
                            return (
                              <div
                                key={subsection.id}
                                className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3 ${
                                  isCompleted ? 'from-green-500/10 to-green-600/10 border-green-500/30' : ''
                                }`}
                              >
                                <button
                                  onClick={() => toggleSubsectionMutation.mutate({ dayId: day.id, subsectionId: subsection.id, dayNumber: day.day_number })}
                                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isCompleted ? 'bg-green-500 border-green-500' : 'border-white/40 hover:border-cyan-400'
                                  }`}
                                >
                                  {isCompleted && <Check className="w-5 h-5 text-white" />}
                                </button>
                                <button
                                  onClick={() => subsection.page && navigate(createPageUrl(subsection.page))}
                                  className="flex-1 flex items-center gap-3 text-left"
                                >
                                  <span className="text-2xl">{subsection.icon}</span>
                                  <div className="flex-1">
                                    <p className={`text-white font-medium ${isCompleted ? 'line-through opacity-60' : ''}`}>{subsection.name}</p>
                                    {subsection.duration && <p className="text-white/60 text-sm">Approx {subsection.duration}</p>}
                                  </div>
                                  {subsection.page && <ChevronRight className="w-5 h-5 text-white/40" />}
                                </button>
                                {isMasterUser && (
                                  <button
                                    onClick={() => handleDeleteSubsection(day.id, subsection.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {isMasterUser && (
                            <div className="bg-white/10 rounded-xl p-4 space-y-2">
                              <Input placeholder="Subsection name" value={newSubsection.name} onChange={(e) => setNewSubsection({...newSubsection, name: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                              <Input placeholder="Approx duration (e.g., 10 minutes)" value={newSubsection.duration} onChange={(e) => setNewSubsection({...newSubsection, duration: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                              <Input placeholder="Emoji icon" value={newSubsection.icon} onChange={(e) => setNewSubsection({...newSubsection, icon: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                              <Input placeholder="Page name (e.g., BabyVideos)" value={newSubsection.page} onChange={(e) => setNewSubsection({...newSubsection, page: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                              <Button onClick={() => handleAddSubsection(day.id)} className="w-full bg-green-500 hover:bg-green-600">
                                <Plus className="w-4 h-4 mr-2" /> Add Subsection
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
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
      </div>
      );
      }