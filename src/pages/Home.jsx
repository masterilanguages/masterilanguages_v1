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
import ActivityCard from "../components/game/ActivityCard";
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
  const [showUserManager, setShowUserManager] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [managingUserEmail, setManagingUserEmail] = useState(localStorage.getItem('admin_managing_user'));
  const [showCoachManager, setShowCoachManager] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");


  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
    document.title = "Home - Lashon Languages";
  }, []);

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

  const profileLoaded = !!userProfile;

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: songProgress = [] } = useQuery({
    queryKey: ['songProgress'],
    queryFn: () => base44.entities.SongProgress.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: todoProgress = [] } = useQuery({
    queryKey: ['todoProgress'],
    queryFn: () => base44.entities.TodoProgress.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: days = [] } = useQuery({
    queryKey: ['days', userProfile?.language],
    queryFn: () => {
      if (!userProfile?.language) return [];
      return base44.entities.Day.filter({ language: userProfile.language });
    },
    enabled: profileLoaded && !!userProfile.language,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: dayProgress = [] } = useQuery({
    queryKey: ['dayProgress'],
    queryFn: () => base44.entities.DayProgress.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: activityProgress = [] } = useQuery({
    queryKey: ['activityProgress'],
    queryFn: () => base44.entities.ActivityProgress.list(),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-date'),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    enabled: profileLoaded,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (currentUser?.role !== 'admin') return [];
      return await base44.entities.User.list();
    },
    enabled: currentUser?.role === 'admin',
    staleTime: 30 * 60 * 1000,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      if (currentUser?.role !== 'admin') return [];
      return await base44.entities.UserProfile.list();
    },
    enabled: currentUser?.role === 'admin',
    staleTime: 30 * 60 * 1000,
  });

  const { data: coachAssignments = [] } = useQuery({
    queryKey: ['coachAssignments'],
    queryFn: () => base44.entities.CoachAssignment.list(),
    enabled: currentUser?.role === 'admin',
    staleTime: 30 * 60 * 1000,
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(userProfile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ dayId, taskId, dayNumber }) => {
      const progress = dayProgress.find(p => p.day_id === dayId) || { day_id: dayId, day_number: dayNumber, subsections_completed: [] };
      const isCompleted = progress.subsections_completed?.includes(taskId);
      const newCompleted = isCompleted 
        ? progress.subsections_completed.filter(id => id !== taskId)
        : [...(progress.subsections_completed || []), taskId];
      
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

  const deleteDayMutation = useMutation({
    mutationFn: (dayId) => base44.entities.Day.delete(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Day deleted!");
    },
  });

  const addDefaultTasksMutation = useMutation({
    mutationFn: async () => {
      const defaultTasks = [
        { id: "video", name: "Watch a video", duration: "20 minutes", page: "BabyVideos" },
        { id: "flashcards", name: "Vocab Flashcards", duration: "10 minutes", page: "Flashcards" },
        { id: "journal", name: "Journal", duration: "5 minutes", page: "Journal" },
        { id: "speak", name: "Speak 1 minute", duration: "1 minute", page: "Flashcards" }
      ];
      
      for (const day of days) {
        const existingIds = (day.subsections || []).map(s => s.id);
        const tasksToAdd = defaultTasks.filter(t => !existingIds.includes(t.id));
        
        if (tasksToAdd.length > 0) {
          const updatedSubsections = [...(day.subsections || []), ...tasksToAdd];
          await base44.entities.Day.update(day.id, { subsections: updatedSubsections });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Default tasks added to all days!");
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: () => base44.entities.UserProfile.delete(userProfile?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate(createPageUrl("AvatarSelect"));
    },
  });

  const changeLanguageMutation = useMutation({
    mutationFn: (newLanguage) => base44.entities.UserProfile.update(userProfile?.id, { language: newLanguage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Language updated!");
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.CoachAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      setShowAssignDialog(false);
      setSelectedCoach("");
      setSelectedStudent("");
      toast.success("Coach assigned!");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.CoachAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      toast.success("Assignment removed");
    },
  });

  // Master user = admin role AND not in onboarding
  const isMasterUser = currentUser?.role === 'admin' && userProfile?.is_new_user !== true;

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



  const [expandedDay, setExpandedDay] = useState(null);
  const [newTask, setNewTask] = useState({ name: "", duration: "", page: "" });
  const [editingTask, setEditingTask] = useState(null); // { dayId, taskId }
  const [editingTaskData, setEditingTaskData] = useState({ name: "", duration: "", page: "" });
  const [currentWeek, setCurrentWeek] = useState(1);
  const [addingTaskToDayId, setAddingTaskToDayId] = useState(null);

  const currentDay = userProfile?.current_day || 1;
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  const isDayUnlocked = (dayNum) => isMasterUser || dayNum <= 3 || dayNum <= currentDay;
  const getDayProgress = (dayId) => dayProgress.find(p => p.day_id === dayId);

  const handleAddTask = (dayId) => {
    if (!newTask.name.trim()) return;
    
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = [...(day.subsections || []), { 
      id: Date.now().toString(), 
      name: newTask.name,
      duration: newTask.duration,
      page: newTask.page
    }];
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    setNewTask({ name: "", duration: "", page: "" });
    setAddingTaskToDayId(null);
  };

  const handleDeleteTask = (dayId, taskId) => {
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = day.subsections.filter(s => s.id !== taskId);
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
  };

  const handleStartEditTask = (dayId, task) => {
    setEditingTask({ dayId, taskId: task.id });
    setEditingTaskData({ name: task.name, duration: task.duration || "", page: task.page || "" });
  };

  const handleSaveEditedTask = (dayId) => {
    if (!editingTaskData.name.trim()) return;
    
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = day.subsections.map(s => 
      s.id === editingTask.taskId 
        ? { ...s, name: editingTaskData.name, duration: editingTaskData.duration, page: editingTaskData.page }
        : s
    );
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    setEditingTask(null);
    setEditingTaskData({ name: "", duration: "", page: "" });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditingTaskData({ name: "", duration: "", page: "" });
  };

  const currentAge = userProfile?.age_level || 3;
  const isBaby = currentAge < 5;
  const hasDiaper = unlockedItems.includes("diaper");

  // Calculate word levels
  const fluentWords = (wordRatings || []).filter(w => w.times_practiced >= 5);
  const learningWords = (wordRatings || []).filter(w => w.times_practiced > 0 && w.times_practiced < 5);

  // Don't render if loading or no language (Layout handles redirect)
  if (profileLoading || !userProfile?.language) {
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 40%, #eae6da 100%)' }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #b8a88018 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #8a9a7815 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #c8b89010 0%, transparent 70%)' }} />
      </div>



      <div className="max-w-4xl mx-auto px-4 pt-4">

        {/* Managing user banner */}
        {managingUserEmail && currentUser?.role === 'admin' && (
          <div className="mt-4 bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 text-center">
            <p className="text-amber-400 font-medium text-sm">👤 Managing: {managingUserEmail}</p>
            <Button
              onClick={() => {
                localStorage.removeItem('admin_managing_user');
                setManagingUserEmail(null);
                toast.success("Returned to admin view");
                window.location.reload();
              }}
              size="sm"
              className="mt-2 bg-red-500 hover:bg-red-600"
            >
              Exit User View
            </Button>
          </div>
        )}
      </div>



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
            {/* SCHEDULE SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>📅 Schedule</h2>
                <Link to={createPageUrl("Home") + "?showSchedule=true"}>
                  <Button variant="ghost" className="text-sm" style={{ color: '#6b7c5a' }}>View All →</Button>
                </Link>
              </div>
              {sortedDays.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-sm">No days available yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedDays.slice(0, 3).map((day, idx) => {
                    const dayColors = [
                      { bg: '#5a6b5a', text: '#f5f0e8' },
                      { bg: '#6b7c63', text: '#f5f0e8' },
                      { bg: '#4a5a4a', text: '#f5f0e8' },
                    ];
                    const dayColor = dayColors[idx % dayColors.length];
                    const progress = getDayProgress(day.id);
                    const allCompleted = day.subsections?.length > 0 && 
                      day.subsections.every(task => progress?.subsections_completed?.includes(task.id));

                    return (
                      <div
                        key={day.id}
                        className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
                        style={{ backgroundColor: dayColor.bg + '40' }}
                        onClick={() => setExpandedDay(expandedDay === day.day_number ? null : day.day_number)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm" style={{ color: '#3d4a2e' }}>{day.title || `Day ${day.day_number}`}</h3>
                          {allCompleted && <span className="text-xs">✓</span>}
                        </div>
                        <span className="text-xs" style={{ color: '#6b7c5a' }}>{day.subsections?.length || 0} tasks</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BACKPACK SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>🎒 Words Backpack</h2>
                <Link to={createPageUrl("Backpack")}>
                  <Button variant="ghost" className="text-sm" style={{ color: '#6b7c5a' }}>View All →</Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 1, count: learningWords.length, icon: '🌱', color: '#6b7c5a' },
                  { level: 2, count: fluentWords.filter(w => w.times_practiced < 10).length, icon: '🌿', color: '#5a6b5a' },
                  { level: 3, count: fluentWords.filter(w => w.times_practiced >= 10).length, icon: '⭐', color: '#3d4a2e' },
                ].map((level) => (
                  <div key={level.level} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                    <div className="text-2xl mb-1">{level.icon}</div>
                    <p className="text-xs font-bold" style={{ color: level.color }}>Level {level.level}</p>
                    <p className="text-lg font-bold" style={{ color: '#3d4a2e' }}>{level.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* JOURNAL SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>📓 Journal</h2>
                <Link to={createPageUrl("Journal")}>
                  <Button variant="ghost" className="text-sm" style={{ color: '#6b7c5a' }}>Write Entry →</Button>
                </Link>
              </div>
              {journalEntries.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-sm">No journal entries yet. Start writing! ✍️</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {journalEntries.slice(0, 2).map((entry) => (
                    <div key={entry.id} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
                      <p style={{ color: '#3d4a2e' }} className="text-xs font-bold">{entry.date}</p>
                      <p style={{ color: '#6b7c5a' }} className="text-sm line-clamp-2 mt-1">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PROGRESS SECTION */}
            <div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>🏆 Progress</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-xs mb-1">Current Day</p>
                  <p className="text-3xl font-bold" style={{ color: '#3d4a2e' }}>{currentDay}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-xs mb-1">Daily Streak 🔥</p>
                  <p className="text-3xl font-bold" style={{ color: '#3d4a2e' }}>{userProfile?.daily_streak || 0}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-xs mb-1">Total Words</p>
                  <p className="text-3xl font-bold" style={{ color: '#3d4a2e' }}>{wordRatings.length}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-center">
                  <p style={{ color: '#6b7c5a' }} className="text-xs mb-1">Coins 🪙</p>
                  <p className="text-3xl font-bold" style={{ color: '#3d4a2e' }}>{coins.toLocaleString()}</p>
                </div>
              </div>
            </div>
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

      {/* Assign Coach Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Assign Coach to Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Coach</label>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="">Select coach...</option>
                {allUsers.filter(user => !['dorong@base44.com', 'liorben@base44.com'].includes(user.email)).map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.email} {user.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="">Select student...</option>
                {allUsers.filter(user => !['dorong@base44.com', 'liorben@base44.com'].includes(user.email)).map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAssignDialog(false)}
                variant="outline"
                className="flex-1 border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedCoach || !selectedStudent) {
                    toast.error("Select both coach and student");
                    return;
                  }
                  if (selectedCoach === selectedStudent) {
                    toast.error("Coach cannot manage themselves");
                    return;
                  }
                  createAssignmentMutation.mutate({
                    coach_email: selectedCoach,
                    student_email: selectedStudent,
                    assigned_by: currentUser.email,
                    assigned_at: new Date().toISOString(),
                  });
                }}
                disabled={createAssignmentMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      </div>
      );
      }