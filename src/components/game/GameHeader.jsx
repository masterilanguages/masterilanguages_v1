import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, BookOpen, Clock, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GameHeader = React.memo(function GameHeader({ profile, coins, onBuyCoins }) {
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const xpToNextLevel = 1000;
  const xpProgress = ((profile?.xp || 0) % xpToNextLevel) / xpToNextLevel * 100;

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
  });

  // Calculate time remaining
  useEffect(() => {
    if (!profile?.session_start || !profile?.session_duration) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(profile.session_start).getTime();
      const durationMs = profile.session_duration * 60 * 1000;
      const endTime = startTime + durationMs;
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
  }, [profile?.session_start, profile?.session_duration]);

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
      session_duration: null
    });
    toast.success("Session ended");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sessionActive = profile?.session_start && profile?.session_duration;

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Avatar */}
                <div className="relative flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-12 h-auto flex items-end justify-center overflow-visible ${profile?.avatar_id === 'jordan' ? 'hue-rotate-[320deg]' : ''}`}>
                      {profile?.avatar_image_url && profile?.avatar_type === 'custom' ? (
                        <img 
                          src={profile.avatar_image_url} 
                          alt={profile.avatar_name} 
                          className="w-full h-auto object-contain" 
                          style={{ borderRadius: 0, clipPath: 'none', mask: 'none' }}
                        />
                      ) : (
                        <span className="text-3xl">
                          {['alex', 'jordan', 'sam'].includes(profile?.avatar_id) ? '🧍‍♂️' : '🧍‍♀️'}
                          {!profile?.avatar_id && '👤'}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-2 py-0.5 text-xs font-bold text-black">
                      {profile?.age_level || 5}
                    </div>
                  </div>
          <div className="hidden md:block">
            <p className="text-white font-bold">{profile?.avatar_name || 'Player'}</p>
            <div className="flex items-center gap-2">
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
            </div>

        {/* Session Timer */}
        <div className="flex items-center gap-2">
          {sessionActive ? (
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  timeRemaining < 300 ? 'bg-red-500/20 border-red-500/50' : 'bg-cyan-500/20 border-cyan-500/50'
                }`}
              >
                <Clock className={`w-5 h-5 ${timeRemaining < 300 ? 'text-red-400' : 'text-cyan-400'}`} />
                <span className={`font-bold ${timeRemaining < 300 ? 'text-red-400' : 'text-cyan-400'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </motion.div>
              <Button
                onClick={endSession}
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Exit
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => startSession(30)}
                variant="outline"
                size="sm"
                className="bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
              >
                <Clock className="w-4 h-4 mr-1" />
                30m
              </Button>
              <Button
                onClick={() => startSession(60)}
                variant="outline"
                size="sm"
                className="bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
              >
                <Clock className="w-4 h-4 mr-1" />
                1hr
              </Button>
            </div>
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