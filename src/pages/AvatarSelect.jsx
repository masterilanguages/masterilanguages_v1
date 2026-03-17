import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AvatarSelect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  useEffect(() => {
    document.title = "Get Started - Lashon Languages";
  }, []);

  const createProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      const currentUser = await base44.auth.me();
      const existing = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (existing.length > 0) {
        return await base44.entities.UserProfile.update(existing[0].id, profileData);
      }
      return await base44.entities.UserProfile.create(profileData);
    },
    onSuccess: async (data, variables) => {
      const currentUser = await base44.auth.me();
      await queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.email] });
      try {
        await base44.functions.invoke('notifyNewUser', {
          userEmail: currentUser?.email,
          userName: currentUser?.full_name,
          avatarName: variables.avatar_name
        });
      } catch (e) {}
      navigate(createPageUrl("Home"));
      toast.success("Welcome! Let's start learning! 🌱");
    },
  });

  const handleStart = () => {
    if (!name.trim()) return toast.error("Please enter your name");
    createProfileMutation.mutate({
      avatar_id: "default",
      avatar_name: name.trim(),
      avatar_status: "ready",
      growth_stage: "starter",
      age_level: 3,
      xp: 0,
      daily_streak: 0,
      is_new_user: false,
      onboarding_completed_at: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-8xl mb-6"
        >
          🌱
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          What's your name?
        </h1>
        <p className="text-xl text-white/90 mb-8">
          We'll use it to personalize your experience.
        </p>

        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="Enter your name"
            maxLength={20}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg text-center"
            autoFocus
          />
        </div>

        <Button
          onClick={handleStart}
          disabled={!name.trim() || createProfileMutation.isPending}
          className="w-full py-6 text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg disabled:opacity-50"
        >
          {createProfileMutation.isPending ? "Starting..." : "Let's go! 🚀"}
        </Button>
      </motion.div>
    </div>
  );
}