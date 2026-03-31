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

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Menu Button */}
        <div className="relative">
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{languageFlags[profile?.language] || '🌍'}</span>
              <p className="text-white font-bold">{languageNames[profile?.language] || 'Language'}</p>
            </div>
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 mb-2 z-50 bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
              >
                <div className="p-2">
                  <div className="px-3 py-2 text-white/60 text-xs font-medium border-b border-white/10">
                    Learning Language
                  </div>
                  <div className="space-y-1 mt-2">
                    {Object.keys(languageFlags).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => changeLanguageMutation.mutate(lang)}
                        disabled={changeLanguageMutation.isPending}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          profile?.language === lang
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl">{languageFlags[lang]}</span>
                        <span className="text-sm font-medium">{languageNames[lang]}</span>
                        {profile?.language === lang && (
                          <span className="ml-auto text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <Button
                      onClick={() => {
                        setShowMenu(false);
                        navigate(createPageUrl("LanguageSelect"));
                      }}
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 justify-start"
                      variant="ghost"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Start Onboarding
                    </Button>
                    <Button
                      onClick={handleLogout}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 justify-start mt-1"
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

        {/* Stats + Timer */}
        <div className="flex items-center gap-2">
          {/* Streak */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/50 rounded-xl px-3 py-2"
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="font-bold text-orange-400">{profile?.daily_streak || 0}</span>
          </motion.div>

          {/* Backpack / Flashcards */}
          <Link to={createPageUrl("Flashcards")}>
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1.5 bg-amber-500 rounded-lg px-2.5 py-1.5">
              <span className="text-base">🎒</span>
            </motion.div>
          </Link>

          {/* Songs */}
          <Link to={createPageUrl("Songs")}>
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1.5 bg-pink-500 rounded-lg px-2.5 py-1.5">
              <span className="text-base">🎵</span>
            </motion.div>
          </Link>

          {/* Journal */}
          <Link to={createPageUrl("Journal")}>
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1.5 bg-purple-500 rounded-lg px-2.5 py-1.5">
              <span className="text-base">📓</span>
            </motion.div>
          </Link>

          {/* Timer */}
          {sessionActive ? (
            <motion.button
              onClick={togglePause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onDoubleClick={endSession}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
                profile.session_paused
                  ? 'bg-yellow-500'
                  : timeRemaining < 300
                    ? 'bg-red-500'
                    : 'bg-cyan-600'
              }`}
              title="Click to pause/resume • Double-click to end"
            >
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">{formatTime(timeRemaining)}{profile.session_paused ? '⏸' : ''}</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => startSession(30)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 bg-cyan-600 rounded-lg px-2.5 py-1.5"
            >
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">Start</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
});

export default GameHeader;