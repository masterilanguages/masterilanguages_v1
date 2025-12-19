import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Heart, ShoppingBag, BookOpen, Users, Play, Trophy, Sparkles, ArrowRight, Flame, Briefcase, School, Baby, Star, ChevronRight, ChevronDown, X, Home as HomeIcon, Video, Library, Book, Calendar, Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  const [levels, setLevels] = useState([
    { 
      id: 1, 
      name: "Level 1", 
      subtitle: "Baby Steps",
      icon: Baby, 
      gradient: "from-pink-500 to-rose-500",
      activities: [
        { id: "youtube", name: "Watch Youtube video", duration: "1 hour", icon: "📺", page: "BabyVideos" },
        { id: "baby_words", name: "Help baby learn 50 first words and learn sentences", duration: "10 minutes", icon: "👶", page: "BabyVideos" },
        { id: "colors", name: "Learn the colors", duration: "5 minutes", icon: "🎨", page: "ColorsLesson" },
        { id: "body_parts", name: "Learn body parts", duration: "5 minutes", icon: "🦵", page: "BodyPartsLesson" },
        { id: "days", name: "Learn days of the week", duration: "5 minutes", icon: "📅", page: "DaysLesson" },
        { id: "months", name: "Learn months of the year", duration: "5 minutes", icon: "🗓️", page: "MonthsLesson" },
        { id: "blessing", name: "Learn a Jewish blessing in Hebrew", duration: "5 minutes", icon: "✡️", page: "Progress" },
        { id: "song_level1", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 1 },
      ]
    },
    { id: 2, name: "Level 2", subtitle: "Growing Up", icon: Star, gradient: "from-amber-500 to-orange-500", activities: [
        { id: "song_level2", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 2 },
      ] 
    },
    { id: 3, name: "Level 3", subtitle: "Explorer", icon: Sparkles, gradient: "from-green-500 to-emerald-500", activities: [
        { id: "song_level3", name: "Learn a song", duration: "10 minutes", icon: "🎵", page: "Songs", level: 3 },
      ] 
    },
    { id: 4, name: "Level 4", subtitle: "Adventurer", icon: Trophy, gradient: "from-blue-500 to-indigo-500", activities: [] },
    { id: 5, name: "Level 5", subtitle: "Master", icon: Star, gradient: "from-purple-500 to-violet-500", activities: [] },
  ]);

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

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const toggleActivityMutation = useMutation({
    mutationFn: async ({ activityId }) => {
      const existing = todoProgress.find(p => p.todo_item_id === activityId);
      if (existing) {
        await base44.entities.TodoProgress.update(existing.id, { completed: !existing.completed });
      } else {
        await base44.entities.TodoProgress.create({ todo_item_id: activityId, completed: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todoProgress'] }),
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



  const [editingLevel, setEditingLevel] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({ name: "", duration: "", icon: "", page: "" });
  const [newLevel, setNewLevel] = useState({ name: "", subtitle: "", gradient: "" });
  const [expandedLevel, setExpandedLevel] = useState(1);

  const isActivityCompleted = (activityId) => {
    return todoProgress.some(p => p.todo_item_id === activityId && p.completed);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const levelId = parseInt(result.source.droppableId.replace('level-', ''));
    const levelIdx = levels.findIndex(l => l.id === levelId);
    
    if (levelIdx === -1) return;
    
    const activities = Array.from(levels[levelIdx].activities);
    const [reorderedItem] = activities.splice(result.source.index, 1);
    activities.splice(result.destination.index, 0, reorderedItem);
    
    const newLevels = [...levels];
    newLevels[levelIdx].activities = activities;
    setLevels(newLevels);
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Learning Activities</h2>
                {isMasterUser && (
                  <Button onClick={() => setNewLevel({ name: "", subtitle: "", gradient: "from-blue-500 to-indigo-500" })} className="bg-green-500 hover:bg-green-600">
                    + Add Level
                  </Button>
                )}
              </div>

              {levels.map((level, levelIdx) => {
                const LevelIcon = level.icon;
                const isExpanded = expandedLevel === level.id;
                return (
                  <motion.div
                    key={level.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
                      className={`w-full bg-gradient-to-r ${level.gradient} p-4 transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <LevelIcon className="w-8 h-8 text-white" />
                          <div className="text-left">
                            <h3 className="text-white font-bold text-xl">{level.name}</h3>
                            <p className="text-white/80 text-sm">{level.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isMasterUser && isExpanded && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-white/30 text-white hover:bg-white/10" 
                              onClick={(e) => { e.stopPropagation(); setNewActivity({ ...newActivity, levelId: level.id }); }}
                            >
                              + Activity
                            </Button>
                          )}
                          <ChevronDown className={`w-6 h-6 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
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
                          <Droppable droppableId={`level-${level.id}`}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className="p-4 space-y-2"
                              >
                                {level.activities.map((activity, actIdx) => {
                                  const completed = isActivityCompleted(activity.id);
                                  return (
                                    <Draggable key={activity.id} draggableId={activity.id} index={actIdx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3 transition-all ${
                                            completed ? 'from-green-500/10 to-green-600/10 border-green-500/30' : ''
                                          } ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
                                        >
                                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            <GripVertical className="w-5 h-5 text-white/40" />
                                          </div>
                                          <button
                                            onClick={() => toggleActivityMutation.mutate({ activityId: activity.id })}
                                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                                              completed ? 'bg-green-500 border-green-500 shadow-lg' : 'border-white/40 hover:border-cyan-400 hover:bg-cyan-500/10'
                                            }`}
                                          >
                                            {completed && <Check className="w-5 h-5 text-white" />}
                                          </button>
                                          <button
                                            onClick={() => navigate(createPageUrl(activity.page))}
                                            className="flex-1 flex items-center gap-3 text-left"
                                          >
                                            <span className="text-2xl">{activity.icon}</span>
                                            <div className="flex-1">
                                              <p className={`text-white font-medium text-lg ${completed ? 'line-through opacity-60' : ''}`}>{activity.name}</p>
                                              <p className="text-white/60 text-sm">{activity.duration}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-white/40" />
                                          </button>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                                {newActivity.levelId === level.id && (
                                  <div className="bg-white/10 rounded-xl p-4 space-y-2">
                                    <Input placeholder="Activity name" value={newActivity.name} onChange={(e) => setNewActivity({...newActivity, name: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                                    <Input placeholder="Duration (e.g., 10 minutes)" value={newActivity.duration} onChange={(e) => setNewActivity({...newActivity, duration: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                                    <Input placeholder="Emoji icon" value={newActivity.icon} onChange={(e) => setNewActivity({...newActivity, icon: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                                    <Input placeholder="Page name (e.g., BabyVideos)" value={newActivity.page} onChange={(e) => setNewActivity({...newActivity, page: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                                    <div className="flex gap-2">
                                      <Button onClick={() => {
                                        levels[levelIdx].activities.push({ id: Date.now().toString(), ...newActivity, levelId: undefined });
                                        setLevels([...levels]);
                                        setNewActivity({ name: "", duration: "", icon: "", page: "" });
                                        toast.success("Activity added!");
                                      }} className="flex-1 bg-green-500 hover:bg-green-600">
                                        Save
                                      </Button>
                                      <Button onClick={() => setNewActivity({ name: "", duration: "", icon: "", page: "" })} variant="outline" className="border-white/20 text-white">
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {newLevel.name !== undefined && (
                <div className="bg-white/10 rounded-xl p-4 space-y-2">
                  <Input placeholder="Level name (e.g., Level 4)" value={newLevel.name} onChange={(e) => setNewLevel({...newLevel, name: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                  <Input placeholder="Subtitle (e.g., Master)" value={newLevel.subtitle} onChange={(e) => setNewLevel({...newLevel, subtitle: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                  <Input placeholder="Gradient (e.g., from-blue-500 to-indigo-500)" value={newLevel.gradient} onChange={(e) => setNewLevel({...newLevel, gradient: e.target.value})} className="bg-white/5 border-white/20 text-white" />
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      setLevels([...levels, { id: levels.length + 1, name: newLevel.name, subtitle: newLevel.subtitle, icon: Star, gradient: newLevel.gradient, activities: [] }]);
                      setNewLevel({ name: "", subtitle: "", gradient: "" });
                      toast.success("Level added!");
                    }} className="flex-1 bg-green-500 hover:bg-green-600">
                      Save Level
                    </Button>
                    <Button onClick={() => setNewLevel({ name: "", subtitle: "", gradient: "" })} variant="outline" className="border-white/20 text-white">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DragDropContext>
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