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

  // Don't render if profile is missing critical data
  if (!profile?.language || !profile?.avatar_id) {
    console.log('GameHeader: hiding - incomplete profile');
    return null;
  }

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

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Avatar */}
        <div className="relative">
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-3 cursor-pointer"
          >
            <div className="relative">
              <div className="w-12 h-auto flex items-end justify-center overflow-visible bg-transparent">
                {profile?.avatar_image_url ? (
                  <img 
                    src={profile.avatar_image_url} 
                    alt={profile.avatar_name} 
                    className="w-full h-auto object-contain bg-transparent" 
                    style={{ borderRadius: 0, clipPath: 'none', mask: 'none', backgroundColor: 'transparent' }}
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-2 py-0.5 text-xs font-bold text-black">
                {profile?.age_level || 5}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{languageFlags[profile?.language] || '🌍'}</span>
                <p className="text-white font-bold hidden sm:inline">{profile?.avatar_name || 'Player'}</p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                  />
                </div>
                <span className="text-xs text-white/60">{profile?.xp || 0} XP</span>
              </div>
            </div>
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 z-50 bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
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

        {/* Session Timer */}
        <div className="flex items-center gap-2">
          {sessionActive ? (
            <div className="flex items-center gap-2">
              <motion.button
                onClick={togglePause}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                  profile.session_paused 
                    ? 'bg-yellow-500/20 border-yellow-500/50' 
                    : timeRemaining < 300 
                      ? 'bg-red-500/20 border-red-500/50' 
                      : 'bg-cyan-500/20 border-cyan-500/50'
                }`}
                title={profile.session_paused ? "Click to resume" : "Click to pause"}
              >
                <Clock className={`w-5 h-5 ${
                  profile.session_paused 
                    ? 'text-yellow-400' 
                    : timeRemaining < 300 
                      ? 'text-red-400' 
                      : 'text-cyan-400'
                }`} />
                <span className={`font-bold ${
                  profile.session_paused 
                    ? 'text-yellow-400' 
                    : timeRemaining < 300 
                      ? 'text-red-400' 
                      : 'text-cyan-400'
                }`}>
                  {formatTime(timeRemaining)} {profile.session_paused && '⏸️'}
                </span>
              </motion.button>
              <Button
                onClick={endSession}
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
              >
                End
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => startSession(30)}
              variant="outline"
              size="sm"
              className="bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
            >
              <Clock className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
        </div>



        {/* Stats */}
        <div className="flex items-center gap-4">
          {/* Streak */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/50 rounded-xl px-3 py-2"
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="font-bold text-orange-400">{profile?.daily_streak || 0}</span>
          </motion.div>

          {/* Backpack */}
          <Link to={createPageUrl("Backpack")}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl px-4 py-2"
            >
              <span className="text-lg">🎒</span>
              <span className="font-bold text-amber-400 hidden md:inline">My Backpack</span>
            </motion.div>
          </Link>

          {/* Songs */}
          <Link to={createPageUrl("Songs")}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/50 rounded-xl px-4 py-2"
            >
              <span className="text-lg">🎵</span>
              <span className="font-bold text-pink-400 hidden md:inline">Songs</span>
            </motion.div>
          </Link>

          {/* Journal */}
          <Link to={createPageUrl("Journal")}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 rounded-xl px-3 py-2"
            >
              <BookOpen className="w-5 h-5 text-purple-400" />
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default GameHeader;