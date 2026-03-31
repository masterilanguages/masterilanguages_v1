import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, BookOpen, Clock, LogOut, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const xpToNextLevel = 1000;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  console.log('GameHeader render:', { 
    hasProfile: !!profile, 
    language: profile?.language, 
    avatarId: profile?.avatar_id 
  });

  const languageFlags = {
    hebrew: '🇮🇱',
    english: '🇺🇸',
    spanish: '🇪🇸',
    french: '🇫🇷',
    portuguese: '🇵🇹',
    italian: '🇮🇹'
  };

  const languageNames = {
    hebrew: 'Hebrew',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    portuguese: 'Portuguese',
    italian: 'Italian'
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

  // Calculate time remaining
  useEffect(() => {
    if (!profile?.session_start || !profile?.session_duration) {
      setTimeRemaining(0);
      return;
    }

    // If paused, don't update timer
    if (profile.session_paused) {
      const startTime = new Date(profile.session_start).getTime();
      const durationMs = profile.session_duration * 60 * 1000;
      const pausedAt = new Date(profile.session_paused_at).getTime();
      const pausedTotal = (profile.session_paused_total || 0) * 1000;
      const endTime = startTime + durationMs + pausedTotal;
      const remaining = Math.max(0, Math.floor((endTime - pausedAt) / 1000));
      setTimeRemaining(remaining);
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(profile.session_start).getTime();
      const durationMs = profile.session_duration * 60 * 1000;
      const pausedTotal = (profile.session_paused_total || 0) * 1000;
      const endTime = startTime + durationMs + pausedTotal;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && profile.session_start) {
        toast.info("Session time expired!");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile?.session_start, profile?.session_duration, profile?.session_paused, profile?.session_paused_at, profile?.session_paused_total]);

  const startSession = (minutes) => {
    updateProfileMutation.mutate({
      session_start: new Date().toISOString(),
      session_duration: minutes
    });
    toast.success(`${minutes} min session started!`);
  };

  const endSession = () => {
    updateProfileMutation.mutate({
      session_start: null,
      session_duration: null,
      session_paused: false,
      session_paused_at: null,
      session_paused_total: 0
    });
    toast.success("Session ended");
  };

  const togglePause = () => {
    if (profile.session_paused) {
      // Resume: add paused duration to total
      const pausedAt = new Date(profile.session_paused_at).getTime();
      const now = Date.now();
      const pausedDuration = Math.floor((now - pausedAt) / 1000);
      const newTotal = (profile.session_paused_total || 0) + pausedDuration;
      
      updateProfileMutation.mutate({
        session_paused: false,
        session_paused_at: null,
        session_paused_total: newTotal
      });
      toast.success("Session resumed");
    } else {
      // Pause
      updateProfileMutation.mutate({
        session_paused: true,
        session_paused_at: new Date().toISOString()
      });
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

  const sessionActive = profile?.session_start && profile?.session_duration;

  // Don't render if profile is missing critical data
  if (!profile?.language) {
    console.log('GameHeader: hiding - incomplete profile');
    return null;
  }

  const navItems = [
    { to: "Home", emoji: "🏠", label: "Home" },
    { to: "Flashcards", emoji: "🎒", label: "Words" },
    { to: "Home", emoji: "📅", label: "Schedule" },
    { to: "Songs", emoji: "🎵", label: "Songs" },
    { to: "MediaLibrary", emoji: "📺", label: "Videos" },
    { to: "Journal", emoji: "📓", label: "Journal" },
    ...(currentUser?.role === 'admin' || currentUser?.role === 'coach' ? [
      { to: "ManageCoaches", emoji: "👥", label: "Coaches" },
    ] : []),
    ...(currentUser?.role === 'admin' ? [
      { to: "Home", emoji: "👤", label: "Users" },
    ] : []),
  ];

  return (
    <div style={{ background: 'linear-gradient(to right, #5a6b5a, #6b7c63, #5a6b5a)', borderBottom: '1px solid #a8b89840' }} className="backdrop-blur-xl">
      {/* Top row: language selector | brand name | logout/settings */}
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-2">

        {/* Left: Language selector */}
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
                    <Button
                      onClick={() => { setShowMenu(false); navigate(createPageUrl("LanguageSelect")); }}
                      className="w-full justify-start text-sm mb-1"
                      style={{ background: '#c9a84c15', color: '#c9a84c' }}
                      variant="ghost"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Start Onboarding
                    </Button>
                    <Button
                      onClick={handleLogout}
                      className="w-full justify-start text-sm"
                      style={{ background: '#ff444415', color: '#ff6b6b' }}
                      variant="ghost"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Brand name */}
        <div className="text-center">
          <p className="font-bold text-base tracking-widest uppercase" style={{ color: '#f5f0e8', fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '0.2em', fontWeight: 300 }}>Language Masteri</p>
        </div>

        {/* Right: Streak + Timer + Login */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: '#ffffff15', border: '1px solid #ffffff25' }}
          >
            <Flame className="w-4 h-4" style={{ color: '#e8f0e0' }} />
            <span className="text-xs font-bold" style={{ color: '#e8f0e0' }}>{profile?.daily_streak || 0}</span>
          </motion.div>

          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: '#ff444415', border: '1px solid #ff444430', color: '#ff6b6b' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>

          {sessionActive ? (
            <motion.button
              onClick={togglePause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onDoubleClick={endSession}
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: profile.session_paused ? '#b8860b' : timeRemaining < 300 ? '#8b1a1a' : '#2d5a3d', border: '1px solid #c9a84c50' }}
              title="Click to pause/resume • Double-click to end"
            >
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{formatTime(timeRemaining)}</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => startSession(30)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: '#ffffff18', border: '1px solid #ffffff30' }}
            >
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">Timer</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Nav bar: all icons centered below brand */}
      <div style={{ borderTop: '1px solid #c9a84c20' }} className="px-4 py-1.5">
        <div className="flex items-center justify-center gap-1 max-w-7xl mx-auto">
          {navItems.map(({ to, emoji, label }, idx) => (
            <Link key={`${to}-${idx}`} to={createPageUrl(to)}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center px-4 py-1 rounded-lg transition-all"
                style={{ background: '#ffffff12', border: '1px solid #ffffff25' }}
              >
                <span className="text-base">{emoji}</span>
                <span className="text-xs font-medium" style={{ color: '#e8f0e4', fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>{label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

export default GameHeader;