import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, LogOut, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GameHeader = React.memo(function GameHeader({ profile, coins, onBuyCoins }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [orderedNav, setOrderedNav] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const longPressTimer = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const languageFlags = {
    hebrew: '🇮🇱', english: '🇺🇸', spanish: '🇪🇸',
    french: '🇫🇷', portuguese: '🇵🇹', italian: '🇮🇹'
  };
  const languageNames = {
    hebrew: 'Hebrew', english: 'English', spanish: 'Spanish',
    french: 'French', portuguese: 'Portuguese', italian: 'Italian'
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  const changeLanguageMutation = useMutation({
    mutationFn: (newLanguage) => base44.entities.UserProfile.update(profile?.id, { language: newLanguage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success("Language updated!");
      setShowMenu(false);
    },
  });

  // Build nav items (must be before useEffect that uses them)
  const baseNavItems = [
    { id: "home", to: "Home", emoji: "🏠", label: "Home" },
    { id: "words", to: "Flashcards", emoji: "🎒", label: "Words" },
    { id: "schedule", to: "Home", emoji: "📅", label: "Schedule" },
    { id: "songs", to: "BabyVideos", emoji: "🎵", label: "Songs" },
    { id: "videos", to: "MediaLibrary", emoji: "📺", label: "Videos" },
    { id: "journal", to: "Journal", emoji: "📓", label: "Journal" },
    ...(currentUser?.role === 'admin' || currentUser?.role === 'coach' ? [
      { id: "coaches", to: "ManageCoaches", emoji: "👥", label: "Coaches" },
    ] : []),
    ...(currentUser?.role === 'admin' ? [
      { id: "users", to: "Home", emoji: "👤", label: "Users" },
      { id: "clock", to: "Home", emoji: "🕐", label: "Clock" },
    ] : []),
  ];

  const getSavedOrder = () => {
    try { return JSON.parse(localStorage.getItem('nav_order') || '[]'); } catch { return []; }
  };

  const getSortedNavItems = (items) => {
    const savedOrder = getSavedOrder();
    if (!savedOrder.length) return items;
    return [...items].sort((a, b) => {
      const ai = savedOrder.indexOf(a.id);
      const bi = savedOrder.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  };

  useEffect(() => {
    if (profile?.language) setOrderedNav(getSortedNavItems(baseNavItems));
  }, [currentUser?.role, profile?.language]);

  // Timer
  useEffect(() => {
    if (!profile?.session_start || !profile?.session_duration) {
      setTimeRemaining(0);
      return;
    }
    if (profile.session_paused) {
      const startTime = new Date(profile.session_start).getTime();
      const durationMs = profile.session_duration * 60 * 1000;
      const pausedAt = new Date(profile.session_paused_at).getTime();
      const pausedTotal = (profile.session_paused_total || 0) * 1000;
      const endTime = startTime + durationMs + pausedTotal;
      setTimeRemaining(Math.max(0, Math.floor((endTime - pausedAt) / 1000)));
      return;
    }
    const updateTimer = () => {
      const startTime = new Date(profile.session_start).getTime();
      const durationMs = profile.session_duration * 60 * 1000;
      const pausedTotal = (profile.session_paused_total || 0) * 1000;
      const endTime = startTime + durationMs + pausedTotal;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0 && profile.session_start) toast.info("Session time expired!");
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile?.session_start, profile?.session_duration, profile?.session_paused, profile?.session_paused_at, profile?.session_paused_total]);

  const startSession = (minutes) => {
    updateProfileMutation.mutate({ session_start: new Date().toISOString(), session_duration: minutes });
    toast.success(`${minutes} min session started!`);
  };

  const endSession = () => {
    updateProfileMutation.mutate({ session_start: null, session_duration: null, session_paused: false, session_paused_at: null, session_paused_total: 0 });
    toast.success("Session ended");
  };

  const togglePause = () => {
    if (profile.session_paused) {
      const pausedAt = new Date(profile.session_paused_at).getTime();
      const newTotal = (profile.session_paused_total || 0) + Math.floor((Date.now() - pausedAt) / 1000);
      updateProfileMutation.mutate({ session_paused: false, session_paused_at: null, session_paused_total: newTotal });
      toast.success("Session resumed");
    } else {
      updateProfileMutation.mutate({ session_paused: true, session_paused_at: new Date().toISOString() });
      toast.info("Session paused");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  // Drag handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
    isDraggingRef.current = true;
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (!draggingId || draggingId === id) return;
    setDragOverId(id);
    setOrderedNav(prev => {
      const from = prev.findIndex(n => n.id === draggingId);
      const to = prev.findIndex(n => n.id === id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    isDraggingRef.current = false;
    localStorage.setItem('nav_order', JSON.stringify(orderedNav.map(n => n.id)));
  };

  const sessionActive = profile?.session_start && profile?.session_duration;

  if (!profile?.language) return null;

  return (
    <div style={{ background: 'linear-gradient(to right, #5a6b5a, #6b7c63, #5a6b5a)', borderBottom: '1px solid #a8b89840' }} className="backdrop-blur-xl">
      {/* Top row */}
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-2">
        {/* Language selector */}
        <div className="relative flex-shrink-0">
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg"
            style={{ background: '#ffffff18', border: '1px solid #ffffff30' }}
          >
            <span className="text-xl">{languageFlags[profile?.language] || '🌍'}</span>
            <span className="font-semibold text-sm" style={{ color: '#c9a84c' }}>{languageNames[profile?.language] || 'Language'}</span>
          </motion.button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 z-50 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
                style={{ background: '#4a5c4a', border: '1px solid #ffffff30' }}
              >
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium border-b" style={{ color: '#c9a84c80', borderColor: '#c9a84c20' }}>
                    Learning Language
                  </div>
                  <div className="space-y-1 mt-2">
                    {Object.keys(languageFlags).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => changeLanguageMutation.mutate(lang)}
                        disabled={changeLanguageMutation.isPending}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                        style={profile?.language === lang ? { background: '#ffffff25', color: '#fff' } : { color: '#d8e4d0' }}
                      >
                        <span className="text-xl">{languageFlags[lang]}</span>
                        <span className="text-sm font-medium">{languageNames[lang]}</span>
                        {profile?.language === lang && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid #c9a84c20' }}>
                    <Button onClick={() => { setShowMenu(false); navigate(createPageUrl("LanguageSelect")); }} className="w-full justify-start text-sm mb-1" style={{ background: '#c9a84c15', color: '#c9a84c' }} variant="ghost">
                      <Globe className="w-4 h-4 mr-2" />Start Onboarding
                    </Button>
                    <Button onClick={handleLogout} className="w-full justify-start text-sm" style={{ background: '#ff444415', color: '#ff6b6b' }} variant="ghost">
                      <LogOut className="w-4 h-4 mr-2" />Logout
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand */}
        <div className="text-center">
          <p className="font-bold text-base tracking-widest uppercase" style={{ color: '#f5f0e8', fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.2em', fontWeight: 300 }}>Language Masteri</p>
        </div>

        {/* Streak + Timer + Logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#ffffff15', border: '1px solid #ffffff25' }}>
            <Flame className="w-4 h-4" style={{ color: '#e8f0e0' }} />
            <span className="text-xs font-bold" style={{ color: '#e8f0e0' }}>{profile?.daily_streak || 0}</span>
          </motion.div>
          <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: '#ff444415', border: '1px solid #ff444430', color: '#ff6b6b' }}>
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>
          {sessionActive ? (
            <motion.button onClick={togglePause} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onDoubleClick={endSession} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: profile.session_paused ? '#b8860b' : timeRemaining < 300 ? '#8b1a1a' : '#2d5a3d', border: '1px solid #c9a84c50' }} title="Click to pause/resume • Double-click to end">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{formatTime(timeRemaining)}</span>
            </motion.button>
          ) : (
            <motion.button onClick={() => startSession(30)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#ffffff18', border: '1px solid #ffffff30' }}>
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">Timer</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Nav grid: 4 per row, hold to drag */}
      <div style={{ borderTop: '1px solid #c9a84c20' }} className="px-4 py-2">
        <div className="grid grid-cols-4 gap-1.5 max-w-sm mx-auto">
          {orderedNav.map(({ id, to, emoji, label }) => {
            const isDragging = draggingId === id;
            const isOver = dragOverId === id && !isDragging;

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, id)}
                onDragOver={(e) => handleDragOver(e, id)}
                onDragEnd={handleDragEnd}
                onClick={() => { if (!isDraggingRef.current) navigate(createPageUrl(to)); }}
                className="flex flex-col items-center py-2 rounded-xl select-none transition-all"
                style={{
                  background: isDragging ? '#ffffff08' : isOver ? '#ffffff25' : '#ffffff12',
                  border: `1px solid ${isDragging ? '#c9a84c40' : isOver ? '#c9a84c80' : '#ffffff25'}`,
                  cursor: 'grab',
                  opacity: isDragging ? 0.35 : 1,
                  transform: isOver ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-xs font-medium mt-0.5" style={{ color: '#e8f0e4', fontFamily: 'Jost, sans-serif', letterSpacing: '0.03em' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default GameHeader;