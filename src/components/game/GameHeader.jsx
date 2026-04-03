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
    { id: "schedule", to: "Home", emoji: "📅", label: "Schedule" },
    { id: "videos", to: "MediaLibrary", emoji: "📚", label: "Library" },
    { id: "progress", to: "Progress", emoji: "🏆", label: "Progress" },
    ...(currentUser?.role === 'admin' ? [
      { id: "clock", to: "Home", emoji: "🕐", label: "Clock" },
    ] : []),
  ];

  const validNavIds = ["home", "schedule", "videos", "progress", "clock", "progress"];
  const getSavedOrder = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('nav_order') || '[]');
      // If saved order contains stale ids, reset it
      const hasStale = saved.some(id => !validNavIds.includes(id));
      if (hasStale) { localStorage.removeItem('nav_order'); return []; }
      return saved;
    } catch { return []; }
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
    <div style={{ background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e4d8 50%, #eae6da 100%)', borderBottom: '1px solid rgba(90, 107, 90, 0.15)' }} className="backdrop-blur-xl">
      {/* Top row */}
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-2">
        {/* Language selector */}
        <div className="relative flex-shrink-0">
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}
          >
            <span className="text-xl">{languageFlags[profile?.language] || '🌍'}</span>
            <span className="font-semibold text-sm" style={{ color: '#3d4a2e', fontFamily: 'Jost, sans-serif', letterSpacing: '0.03em' }}>{languageNames[profile?.language] || 'Language'}</span>
          </motion.button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 z-50 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
                style={{ background: '#f5f0e8', border: '1px solid rgba(90, 107, 90, 0.2)' }}
              >
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium border-b" style={{ color: '#6b7c5a', borderColor: 'rgba(90, 107, 90, 0.15)', fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    Learning Language
                  </div>
                  <div className="space-y-1 mt-2">
                    {Object.keys(languageFlags).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => changeLanguageMutation.mutate(lang)}
                        disabled={changeLanguageMutation.isPending}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                        style={profile?.language === lang ? { background: 'rgba(90, 107, 90, 0.1)', color: '#3d4a2e' } : { color: '#6b7c5a' }}
                      >
                        <span className="text-xl">{languageFlags[lang]}</span>
                        <span className="text-sm font-medium" style={{ color: 'inherit', fontFamily: 'Jost, sans-serif' }}>{languageNames[lang]}</span>
                        {profile?.language === lang && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(90, 107, 90, 0.15)' }}>
                    <Button onClick={() => { setShowMenu(false); navigate(createPageUrl("LanguageSelect")); }} className="w-full justify-start text-sm mb-1" style={{ background: 'rgba(90, 107, 90, 0.05)', color: '#5a6b5a' }} variant="ghost">
                      <Globe className="w-4 h-4 mr-2" />Start Onboarding
                    </Button>
                    <Button onClick={handleLogout} className="w-full justify-start text-sm" style={{ background: 'rgba(200, 50, 50, 0.08)', color: '#8b3a3a' }} variant="ghost">
                      <LogOut className="w-4 h-4 mr-2" />Logout
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand */}
        <div className="text-center flex-1">
          <p className="font-bold text-2xl tracking-widest" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.08em', fontWeight: 500 }}>Language Mastery</p>
        </div>

        {/* Streak + Timer + Progress + Logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}>
            <Flame className="w-4 h-4" style={{ color: '#d4a574' }} />
            <span className="text-xs font-bold" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>{profile?.daily_streak || 0}</span>
          </motion.div>
          {sessionActive ? (
            <motion.button onClick={togglePause} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onDoubleClick={endSession} className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer" style={{ background: profile.session_paused ? '#d4a574' : timeRemaining < 300 ? '#c97c6f' : '#7a9b6f', border: '1px solid rgba(90, 107, 90, 0.2)' }} title="Click to pause/resume • Double-click to end">
              <Clock className="w-4 h-4" style={{ color: '#3d4a2e' }} />
              <span className="font-bold text-xs" style={{ color: '#3d4a2e', fontFamily: 'Jost, sans-serif' }}>{formatTime(timeRemaining)}</span>
            </motion.button>
          ) : (
            <motion.button onClick={() => startSession(30)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}>
              <Clock className="w-4 h-4" style={{ color: '#6b7c5a' }} />
              <span className="font-bold text-xs" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>Timer</span>
            </motion.button>
          )}
          {(currentUser?.role === 'admin' || currentUser?.role === 'coach') && (
            <motion.button onClick={() => navigate(createPageUrl("ManageCoaches"))} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}>
              <span className="font-bold text-xs" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>👥 People</span>
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}>
            <span className="font-bold text-xs" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>💳 Payments</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(90, 107, 90, 0.08)', border: '1px solid rgba(90, 107, 90, 0.2)' }}>
            <span className="font-bold text-xs" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif' }}>⚙️ Settings</span>
          </motion.button>
          <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer" style={{ background: 'rgba(200, 50, 50, 0.08)', border: '1px solid rgba(200, 50, 50, 0.2)', color: '#8b3a3a', fontFamily: 'Jost, sans-serif' }}>
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>
        </div>
      </div>

      {/* Nav grid: 4 per row, hold to drag */}
      <div style={{ borderTop: '1px solid rgba(90, 107, 90, 0.15)' }} className="px-4 py-2">
        <div className="grid grid-cols-5 gap-1.5 max-w-lg mx-auto">
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
                  background: isDragging ? 'rgba(90, 107, 90, 0.08)' : isOver ? 'rgba(90, 107, 90, 0.15)' : 'rgba(90, 107, 90, 0.06)',
                  border: `1px solid ${isDragging ? 'rgba(90, 107, 90, 0.3)' : isOver ? 'rgba(90, 107, 90, 0.4)' : 'rgba(90, 107, 90, 0.15)'}`,
                  cursor: 'grab',
                  opacity: isDragging ? 0.35 : 1,
                  transform: isOver ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-xs font-medium mt-0.5" style={{ color: '#6b7c5a', fontFamily: 'Jost, sans-serif', letterSpacing: '0.03em' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default GameHeader;