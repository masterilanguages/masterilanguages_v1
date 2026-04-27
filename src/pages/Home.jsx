import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Heart, ShoppingBag, BookOpen, Users, Play, Trophy, Sparkles, ArrowRight, Flame, Briefcase, School, Baby, Star, ChevronRight, ChevronDown, X, Home as HomeIcon, Library, Book, Calendar, Check, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ActivityCard from "../components/game/ActivityCard";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import BabyGame from "../components/game/BabyGame";
import AvatarMenu from "../components/game/AvatarMenu";
import PostVideoFlashcards from "../components/video/PostVideoFlashcards";
import SongTranscriptModal from "../components/songs/SongTranscriptModal";
import ContentLibraryPicker from "../components/home/ContentLibraryPicker";





const languageNames = {
  hebrew: 'Hebrew', english: 'English', spanish: 'Spanish',
  french: 'French', portuguese: 'Portuguese', italian: 'Italian'
};

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
  const { selected_language } = useLanguage();
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
  const [expandedDay, setExpandedDay] = useState(1);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [newTask, setNewTask] = useState({ name: "", youtube_url: "", page: "" });
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskData, setEditingTaskData] = useState({ name: "", youtube_url: "", page: "" });
  const [currentWeek, setCurrentWeek] = useState(1);
  const [addingTaskToDayId, setAddingTaskToDayId] = useState(null);
  const [quickVideoUrl, setQuickVideoUrl] = useState({});
  const [addingVideoToDayId, setAddingVideoToDayId] = useState(null);
  const [newTaskForm, setNewTaskForm] = useState({}); // { [dayId]: { title, transcript, mediaUrl, videoId, mediaUploaded } }
  const [libraryPickerDayId, setLibraryPickerDayId] = useState(null);
  const [sessionModal, setSessionModal] = useState(null); // day object

  const [showSessionFlashcards, setShowSessionFlashcards] = useState(false);
  const [sessionFlashcardWords, setSessionFlashcardWords] = useState([]);
  const [loadingSessionWords, setLoadingSessionWords] = useState(false);
  const [selectedSongForTranscript, setSelectedSongForTranscript] = useState(null);
  const [savingSongTranscript, setSavingSongTranscript] = useState(false);


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
    staleTime: 0,
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
    queryKey: ['days', selected_language],
    queryFn: () => {
      if (!selected_language) return [];
      return base44.entities.Day.filter({ language: selected_language });
    },
    enabled: profileLoaded && !!selected_language,
    staleTime: 0,
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

  const updateSongTranscriptMutation = useMutation({
    mutationFn: ({ songId, transcript }) => base44.entities.DailySong.update(songId, { lyrics_he: transcript }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailySongs'] });
      toast.success("Transcript saved!");
      setSelectedSongForTranscript(null);
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



  const currentDay = userProfile?.current_day || 1;
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

  const isDayUnlocked = (dayNum) => isMasterUser || dayNum <= 3 || dayNum <= currentDay;
  const getDayProgress = (dayId) => dayProgress.find(p => p.day_id === dayId);

  const handleAddTask = (dayId) => {
    if (!newTask.name.trim()) return;
    
    const day = days.find(d => d.id === dayId);
    const videoId = extractYouTubeId(newTask.youtube_url);
    const updatedSubsections = [...(day.subsections || []), { 
      id: Date.now().toString(), 
      name: newTask.name,
      youtube_url: newTask.youtube_url,
      video_id: videoId || undefined,
      page: newTask.page || (videoId ? "MediaLibrary" : ""),
    }];
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    setNewTask({ name: "", youtube_url: "", page: "" });
    setAddingTaskToDayId(null);
  };

  const handleDeleteTask = (dayId, taskId) => {
    const day = days.find(d => d.id === dayId);
    const updatedSubsections = day.subsections.filter(s => s.id !== taskId);
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const handleStartEditTask = (dayId, task) => {
    setEditingTask({ dayId, taskId: task.id });
    setEditingTaskData({ name: task.name, youtube_url: task.youtube_url || "", page: task.page || "", mediaUrl: task.mediaUrl || "" });
  };

  const handleSaveEditedTask = (dayId) => {
    if (!editingTaskData.name.trim()) return;
    
    const day = days.find(d => d.id === dayId);
    const videoId = extractYouTubeId(editingTaskData.youtube_url);
    const updatedSubsections = day.subsections.map(s => 
      s.id === editingTask.taskId 
        ? { ...s, name: editingTaskData.name, youtube_url: editingTaskData.youtube_url, video_id: videoId || (editingTaskData.mediaUrl ? null : s.video_id), page: editingTaskData.page || (videoId ? "MediaLibrary" : s.page), mediaUrl: editingTaskData.mediaUrl || s.mediaUrl }
        : s
    );
    updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    setEditingTask(null);
    setEditingTaskData({ name: "", youtube_url: "", page: "" });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditingTaskData({ name: "", youtube_url: "", page: "" });
  };

  const handleQuickAddVideo = async (dayId, dayNumber) => {
    const url = quickVideoUrl[dayId]?.trim();
    if (!url) return;
    const videoId = extractYouTubeId(url);
    if (!videoId) { toast.error("Invalid YouTube URL"); return; }

    // Fetch title from oEmbed
    let title = `Video - Session ${dayNumber}`;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      const meta = await res.json();
      title = meta.title || title;
    } catch {}

    // Add to MediaLibrary
    await base44.entities.MediaLibrary.create({
      title,
      language: userProfile?.language || "hebrew",
      video_url: url,
      video_id: videoId,
      topics: [],
      difficulty_level: "All",
      tags: "",
      is_active: true,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      notes: `Session ${dayNumber}`,
    });

    // Add as task to the day
    const day = days.find(d => d.id === dayId);
    const taskId = `video_${videoId}`;
    const existing = (day?.subsections || []).find(s => s.id === taskId || s.video_id === videoId);
    if (!existing) {
      const updatedSubsections = [...(day?.subsections || []), {
        id: taskId,
        name: `▶ ${title}`,
        video_id: videoId,
        page: "MediaLibrary",
      }];
      updateDayMutation.mutate({ id: dayId, data: { subsections: updatedSubsections } });
    }

    setQuickVideoUrl(prev => ({ ...prev, [dayId]: "" }));
    setAddingVideoToDayId(null);
    toast.success("Video added to schedule!");
    queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
  };

  const reorderTasks = (dayId, fromIdx, toIdx) => {
    const day = days.find(d => d.id === dayId);
    if (!day) return;
    const updated = [...(day.subsections || [])];
    const [item] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, item);
    updateDayMutation.mutate({ id: dayId, data: { subsections: updated } });
  };

  const currentAge = userProfile?.age_level || 3;
  const isBaby = currentAge < 5;
  const hasDiaper = unlockedItems.includes("diaper");

  // Calculate word levels
  const fluentWords = (wordRatings || []).filter(w => w.times_practiced >= 5);
  const learningWords = (wordRatings || []).filter(w => w.times_practiced > 0 && w.times_practiced < 5);

  // Don't render if profile still loading
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

  // No content for this language
  if (sortedDays.length === 0 && !isMasterUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 40%, #eae6da 100%)' }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, serif' }}>No Content Available</h2>
          <p className="text-stone-500 mb-4">There are no lessons available for {languageNames[selected_language] || 'this language'} yet.</p>
          <button
            onClick={() => navigate(createPageUrl("LanguageSelect"))}
            className="px-6 py-3 rounded-xl text-white font-semibold transition-all"
            style={{ background: '#5a6b5a' }}
          >
            Choose Different Language
          </button>
        </div>
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
          <div className="space-y-10">

            {/* PRIMARY CTA */}
            <div className="text-center py-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/SpeakingSession')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold shadow-lg transition-all mb-3"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
              >
                <span className="text-xl">🎤</span>
                Speaking Session
                <ChevronRight className="w-5 h-5" />
              </motion.button>
              <br />

            </div>

            {/* RECOMMENDED FOR YOU */}
            {userProfile?.onboarding_completed && (
              <RecommendedForYou userProfile={userProfile} />
            )}

            {/* SCHEDULE SECTION */}
            {(() => {
              return (
              <div className="flex justify-center">
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    onClick={() => navigate(createPageUrl("Days"))}
                  >
                    📅 Schedule <ChevronRight className="inline w-5 h-5 mb-1" />
                  </h2>
                  <Link to={createPageUrl('Backpack')} className="no-underline">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all" style={{ background: '#ffffff', color: '#3d4a2e', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e0dcd4' }}>
                      <span>🎒</span><span>Backpack</span>
                    </div>
                  </Link>
                </div>
                  {sortedDays.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      No sessions available yet
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
                    const isExpanded = expandedDay === day.day_number;

                    return (
                      <div key={day.id}>
                        <div
                          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
                          style={{ backgroundColor: dayColor.bg + '40' }}
                          onClick={() => {
                            if (isMasterUser) { setExpandedDay(expandedDay === day.day_number ? null : day.day_number); return; }
                            setSessionModal(day);
                          }}
                        >
                          <h3 className="font-bold text-sm" style={{ color: '#3d4a2e' }}>Session {day.day_number}</h3>
                          <ChevronDown className={`w-4 h-4 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`} style={{ color: '#6b7c5a' }} />
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1 space-y-1 pl-3">
                                {/* Add from content library — only show if no content yet */}
                                {isMasterUser && (day.subsections || []).length === 0 && (
                                  <button
                                    onClick={() => setLibraryPickerDayId(day.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 mb-1"
                                    style={{ color: '#6b7c5a', background: '#5a6b5a10', border: '1px dashed #5a6b5a40' }}
                                  >
                                    <Plus className="w-3 h-3" /> + Add from content library
                                  </button>
                                )}
                                           {(day.subsections || []).filter(task => {
                                             const taskName = task.name?.toLowerCase() || '';
                                             // "The Bride" is Hebrew-only — hide for all non-Hebrew languages
                                             if (taskName.includes('the bride') && selected_language !== 'hebrew') return false;
                                             // Hide generic "Watch a video" if a specific video task exists
                                             if (task.id === 'video' && (day.subsections || []).some(s => s.video_id)) return false;
                                             return true;
                                           }).map((task, idx) => {
                                  const isSong = task.song_id || (songs && songs.find(s => s.id === task.id));
                                    const isTaskDone = progress?.subsections_completed?.includes(task.id);
                                    const isDragging = draggedTask?.dayId === day.id && draggedTask?.idx === idx;
                                    const isDragOver = dragOverTask?.dayId === day.id && dragOverTask?.idx === idx;
                                    const isEditing = editingTask?.dayId === day.id && editingTask?.taskId === task.id;
                                    return (
                                      <div key={task.id} className="flex flex-col gap-1">
                                        {isEditing ? (
                                         <div className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-xl border border-cyan-400/50">
                                             {/* Editable title */}
                                             <input
                                               autoFocus
                                               value={editingTaskData.name}
                                               onChange={(e) => setEditingTaskData(prev => ({ ...prev, name: e.target.value }))}
                                               onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditedTask(day.id); if (e.key === 'Escape') handleCancelEdit(); }}
                                               className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium text-stone-800 placeholder:text-stone-400"
                                               placeholder="Title"
                                             />
                                             {/* YouTube URL — saves on blur */}
                                             <input
                                               value={editingTaskData.youtube_url}
                                               onChange={(e) => setEditingTaskData(prev => ({ ...prev, youtube_url: e.target.value }))}
                                               onBlur={() => { if (editingTaskData.youtube_url.trim()) handleSaveEditedTask(day.id); }}
                                               onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditedTask(day.id); }}
                                               className="w-36 bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 outline-none focus:border-cyan-400 placeholder:text-stone-400"
                                               placeholder="YouTube URL"
                                             />
                                             {/* MP3 upload — saves immediately */}
                                             <label className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-stone-400 cursor-pointer hover:bg-stone-100 transition-all text-xs text-stone-500 whitespace-nowrap flex-shrink-0">
                                               🎵 MP3
                                               <input
                                                 type="file"
                                                 accept="audio/*"
                                                 className="hidden"
                                                 onChange={async (e) => {
                                                   const file = e.target.files[0];
                                                   if (!file) return;
                                                   const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                                   const updated = { ...editingTaskData, mediaUrl: file_url, youtube_url: '' };
                                                   const d = days.find(x => x.id === day.id);
                                                   const updatedSubs = d.subsections.map(s =>
                                                     s.id === editingTask.taskId
                                                       ? { ...s, name: updated.name, youtube_url: '', video_id: null, mediaUrl: file_url, page: updated.page }
                                                       : s
                                                   );
                                                   updateDayMutation.mutate({ id: day.id, data: { subsections: updatedSubs } });
                                                   setEditingTask(null);
                                                   toast.success('MP3 uploaded!');
                                                 }}
                                               />
                                             </label>
                                           </div>
                                        ) : (
                                          <div
                                            draggable
                                            onDragStart={() => setDraggedTask({ dayId: day.id, idx })}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              setDragOverTask({ dayId: day.id, idx });
                                            }}
                                            onDragLeave={() => setDragOverTask(null)}
                                            onDrop={() => {
                                              if (draggedTask && draggedTask.dayId === day.id && draggedTask.idx !== idx) {
                                                reorderTasks(day.id, draggedTask.idx, idx);
                                              }
                                              setDraggedTask(null);
                                              setDragOverTask(null);
                                            }}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg hover:opacity-80 transition-all group ${isDragging ? 'cursor-grabbing opacity-50' : 'cursor-pointer'} ${isDragOver ? 'border-t-2 border-b-2 border-cyan-400 my-2' : ''}`}
                                            style={{ background: isTaskDone ? '#5a6b5a30' : '#ffffff50', border: isDragOver ? undefined : '1px solid #5a6b5a20' }}
                                            onClick={async () => {
                                             if (isDragging) return;
                                             if (isSong) {
                                               const songData = songs.find(s => s.id === task.id || s.id === task.song_id);
                                               if (songData?.id) {
                                                 navigate(`/SingingLesson?songId=${songData.id}`);
                                               } else {
                                                 navigate('/SingingHome');
                                               }
                                               return;
                                             }
                                             const ytId = task.video_id || extractYouTubeId(task.youtube_url);
                                             if (ytId) {
                                               navigate(createPageUrl('MediaLibrary') + `?videoId=${ytId}`);
                                             } else if (task.mediaUrl) {
                                               // Look up saved transcript from MediaLibrary
                                               let transcript = task.transcript || '';
                                               let mediaLibraryId = null;
                                               try {
                                                 const results = await base44.entities.MediaLibrary.filter({ video_url: task.mediaUrl });
                                                 if (results[0]) {
                                                   transcript = results[0].transcript_phonetics || transcript;
                                                   mediaLibraryId = results[0].id;
                                                 }
                                               } catch {}
                                               sessionStorage.setItem('songListenData', JSON.stringify({ title: task.name, mediaUrl: task.mediaUrl || '', transcript, videoId: '', mediaLibraryId }));
                                               navigate('/SongListenPage');
                                             } else if (task.page) {
                                               navigate(createPageUrl(task.page));
                                              } else {
                                                // Try to find a matching MediaLibrary entry by title
                                                try {
                                                  const allMedia = await base44.entities.MediaLibrary.list();
                                                  const match = allMedia.find(m => 
                                                    m.title?.toLowerCase().includes(task.name?.toLowerCase()) ||
                                                    task.name?.toLowerCase().includes(m.title?.toLowerCase())
                                                  );
                                                  if (match?.video_id) {
                                                    navigate(createPageUrl('MediaLibrary') + `?videoId=${match.video_id}`);
                                                  } else if (match?.video_url) {
                                                    sessionStorage.setItem('songListenData', JSON.stringify({ title: match.title, mediaUrl: match.video_url, transcript: match.transcript_phonetics || '', videoId: '', mediaLibraryId: match.id }));
                                                    navigate('/SongListenPage');
                                                  } else {
                                                    // No media found — open SongListenPage so user can add audio/transcript
                                                    sessionStorage.setItem('songListenData', JSON.stringify({ title: task.name, mediaUrl: '', transcript: '', videoId: '' }));
                                                    navigate('/SongListenPage');
                                                  }
                                                } catch {
                                                  sessionStorage.setItem('songListenData', JSON.stringify({ title: task.name, mediaUrl: '', transcript: '', videoId: '' }));
                                                  navigate('/SongListenPage');
                                                }
                                              }
                                            }}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isTaskDone ? 'bg-green-500 border-green-500' : 'border-stone-400'}`}>
                                                {isTaskDone && <Check className="w-2.5 h-2.5 text-white" />}
                                              </div>
                                              <span className="text-sm font-medium" style={{ color: '#3d4a2e' }}>{task.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                             {(task.video_id || extractYouTubeId(task.youtube_url)) && <span className="text-xs" style={{ color: '#6b7c5a' }}>▶ video</span>}
                                             {task.mediaUrl && <span className="text-xs" style={{ color: '#6b7c5a' }}>🎵 audio</span>}
                                             {isMasterUser && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleStartEditTask(day.id, task); }}
                                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-stone-700 text-xs px-1"
                                                  title="Edit task"
                                                  >
                                                  <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>✏️</span>
                                                </button>
                                              )}
                                            {isMasterUser && (
                                               <button
                                                 onClick={(e) => { e.stopPropagation(); handleDeleteTask(day.id, task.id); }}
                                                 className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-xs px-1"
                                                 title="Remove from schedule"
                                               >
                                                 ✕
                                               </button>
                                             )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                 })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  </div>
                  )}
              </div>
            </div>
              );
            })()}




          </div>
        )}
                </div>

      {/* Session Instruction Modal */}
      {sessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4" onClick={() => setSessionModal(null)}>
          <div
            className="bg-stone-50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <h2 className="text-2xl font-bold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, serif' }}>Session {sessionModal.day_number}</h2>
              <p className="text-stone-500 text-sm mt-1">Follow the steps below to complete this session</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
              <p className="font-semibold text-stone-700 text-sm">📋 Instructions</p>
              <ol className="space-y-2 text-stone-600 text-sm list-decimal list-inside">
                <li>Watch the video for this session</li>
                <li>Follow along with the transcript</li>
                <li>When you're done, click <strong>"I'm Done"</strong> below</li>
                <li>Rank the key vocabulary words from the session</li>
              </ol>
            </div>
            {/* Video tasks - open in-app with sessionDay param */}
            {(sessionModal.subsections || []).map(task => {
              const ytId = task.video_id || extractYouTubeId(task.youtube_url);
              if (ytId) {
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSessionModal(null);
                      navigate(createPageUrl('MediaLibrary') + `?videoId=${ytId}&sessionDay=${sessionModal.day_number}`);
                    }}
                    className="flex items-center gap-3 bg-stone-100 rounded-xl p-3 border border-stone-200 hover:border-stone-400 transition-all w-full text-left"
                  >
                    <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div>
                      <p className="text-stone-700 font-semibold text-sm">{task.name}</p>
                      <p className="text-stone-400 text-xs mt-0.5">▶ Watch video</p>
                    </div>
                  </button>
                );
              } else if (task.mediaUrl) {
                return (
                  <button
                    key={task.id}
                    onClick={async () => {
                      setSessionModal(null);
                      let transcript = task.transcript || '';
                      let mediaLibraryId = null;
                      try {
                        const results = await base44.entities.MediaLibrary.filter({ video_url: task.mediaUrl });
                        if (results[0]) {
                          transcript = results[0].transcript_phonetics || transcript;
                          mediaLibraryId = results[0].id;
                        }
                      } catch {}
                      sessionStorage.setItem('songListenData', JSON.stringify({ title: task.name, mediaUrl: task.mediaUrl, transcript, videoId: '', mediaLibraryId }));
                      navigate('/SongListenPage');
                    }}
                    className="flex items-center gap-3 bg-stone-100 rounded-xl p-3 border border-stone-200 hover:border-stone-400 transition-all w-full text-left"
                  >
                    <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl bg-stone-200">🎵</div>
                    <div>
                      <p className="text-stone-700 font-semibold text-sm">{task.name}</p>
                      <p className="text-stone-400 text-xs mt-0.5">🎧 Listen</p>
                    </div>
                  </button>
                );
              }
              return null;
            })}
            <div className="pt-1">
              <button
                onClick={() => setSessionModal(null)}
                className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-500 text-sm font-medium hover:bg-stone-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Library Picker */}
      <ContentLibraryPicker
        open={!!libraryPickerDayId}
        onOpenChange={(open) => { if (!open) setLibraryPickerDayId(null); }}
        language={userProfile?.language}
        onSelect={(media) => {
          const day = days.find(d => d.id === libraryPickerDayId);
          if (!day) return;
          const isYouTube = !!media.video_id;
          const taskId = isYouTube ? `video_${media.video_id}` : `task_${Date.now()}`;
          const existing = (day.subsections || []).find(s => s.id === taskId);
          if (existing) { toast.info('Already in this session'); return; }
          const sub = isYouTube
            ? { id: taskId, name: `▶ ${media.title}`, video_id: media.video_id, page: 'MediaLibrary' }
            : { id: taskId, name: media.title, page: '', mediaUrl: media.video_url || '' };
          updateDayMutation.mutate({ id: libraryPickerDayId, data: { subsections: [...(day.subsections || []), sub] } });
          toast.success(`"${media.title}" added to session!`);
        }}
      />

      {/* Song Transcript Modal */}
      <SongTranscriptModal
        open={!!selectedSongForTranscript}
        onOpenChange={(open) => !open && setSelectedSongForTranscript(null)}
        song={selectedSongForTranscript}
        onSave={(transcript) => {
          setSavingSongTranscript(true);
          updateSongTranscriptMutation.mutate({ songId: selectedSongForTranscript.id, transcript }, {
            onSettled: () => setSavingSongTranscript(false),
          });
        }}
        isSaving={savingSongTranscript}
      />

      {/* Post-video flashcards */}
      {showSessionFlashcards && sessionFlashcardWords.length > 0 && (
        <PostVideoFlashcards
          words={sessionFlashcardWords}
          videoTitle={sessionModal?.day_number ? `Session ${sessionModal.day_number}` : 'this session'}
          userProfile={userProfile}
          onClose={() => { setShowSessionFlashcards(false); setSessionFlashcardWords([]); }}
          onJournal={() => { setShowSessionFlashcards(false); setSessionFlashcardWords([]); navigate(createPageUrl('Journal')); }}
        />
      )}
      {showSessionFlashcards && sessionFlashcardWords.length === 0 && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-stone-50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="text-4xl">🎒</div>
            <h3 className="text-xl font-bold" style={{ color: '#3d4a2e' }}>No vocab words yet</h3>
            <p className="text-stone-500 text-sm">Vocab words will appear here once they've been added to this session.</p>
            <button
              onClick={() => setShowSessionFlashcards(false)}
              className="w-full py-3 rounded-xl text-white font-bold"
              style={{ background: '#5a6b5a' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

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