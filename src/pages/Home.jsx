import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Heart, ShoppingBag, BookOpen, Users, Play, Book, Video, Trophy, Sparkles, ArrowRight, Flame, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import AvatarDisplay from "../components/game/AvatarDisplay";
import BadgeDisplay from "../components/game/BadgeDisplay";
import ActivityCard from "../components/game/ActivityCard";

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

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
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
  });

  const { data: activityProgress = [] } = useQuery({
    queryKey: ['activityProgress'],
    queryFn: () => base44.entities.ActivityProgress.list(),
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  // Redirect to avatar selection if no profile
  useEffect(() => {
    if (!profileLoading && !userProfile) {
      navigate(createPageUrl("AvatarSelect"));
    }
  }, [userProfile, profileLoading, navigate]);

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Avatar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
              <AvatarDisplay profile={userProfile} equippedItem={equippedItem} className="mx-auto" />
              
              <div className="mt-8">
                <h3 className="text-white/80 text-sm font-semibold mb-3">BADGES</h3>
                <BadgeDisplay earnedBadges={userProfile?.badges || []} size="sm" />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to={createPageUrl("Practice")}
                  className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-xl p-4 text-center hover:bg-cyan-500/30 transition-all"
                >
                  <Book className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">Words</span>
                </Link>
                <Link
                  to={createPageUrl("Videos")}
                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-xl p-4 text-center hover:bg-purple-500/30 transition-all"
                >
                  <Video className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">Videos</span>
                </Link>
              </div>

              <Link
                to={createPageUrl("Store")}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-xl text-yellow-400 font-medium hover:bg-yellow-500/30 transition-all"
              >
                <Sparkles className="w-5 h-5" /> Treasure Store
              </Link>
            </div>
          </div>

          {/* Right: Activities */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Life Activities</h2>
              <div className="flex items-center gap-2 text-white/60">
                <Flame className="w-5 h-5 text-orange-400" />
                <span>Complete activities to grow your avatar!</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isUnlocked={isUnlocked(activity)}
                  completions={getProgress(activity.id)?.completions || 0}
                  minAge={activity.minAge}
                  currentAge={userProfile?.age_level || 5}
                  onClick={() => navigate(createPageUrl("Activities") + `?id=${activity.id}`)}
                />
              ))}
            </div>

            {/* Quick earn section */}
            <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">⚡ Quick Earn Coins</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <Link
                  to={createPageUrl("Practice")}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Book className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Learn Words</p>
                    <p className="text-green-400 text-sm">+10 coins each</p>
                  </div>
                </Link>
                <Link
                  to={createPageUrl("Videos")}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Watch Videos</p>
                    <p className="text-purple-400 text-sm">+25 coins each</p>
                  </div>
                </Link>
                <Link
                  to={createPageUrl("Progress")}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Complete Lessons</p>
                    <p className="text-blue-400 text-sm">+100 coins each</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}