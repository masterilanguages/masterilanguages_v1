import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Dumbbell, Church, UtensilsCrossed, Users, ShoppingBag, Heart, BookOpen, Lock, Check, Coins, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ActivityExperience from "../components/activities/ActivityExperience";

const activities = [
  { id: "supermarket", name: "Supermarket", icon: ShoppingCart, gradient: "from-green-500 to-emerald-500", cost: 50, requiredCompletions: 0, unlockRequirement: null, description: "Buy groceries in Hebrew" },
  { id: "gym", name: "Gym", icon: Dumbbell, gradient: "from-orange-500 to-red-500", cost: 75, requiredCompletions: 0, unlockRequirement: { activity: "supermarket", count: 3 }, description: "Learn body vocabulary" },
  { id: "synagogue", name: "Synagogue", icon: Church, gradient: "from-blue-500 to-indigo-500", cost: 100, requiredCompletions: 0, unlockRequirement: null, description: "Learn important prayers" },
  { id: "shabbat_dinner", name: "Shabbat Dinner", icon: UtensilsCrossed, gradient: "from-purple-500 to-violet-500", cost: 150, requiredCompletions: 0, unlockRequirement: { activity: "synagogue", count: 3, item: "tuxedo" }, description: "Experience a traditional dinner" },
  { id: "meet_moroccan", name: "Meet Moroccan Girl", icon: Heart, gradient: "from-pink-500 to-rose-500", cost: 100, requiredCompletions: 0, unlockRequirement: { activity: "shabbat_dinner", count: 1 }, description: "A special encounter" },
  { id: "mall", name: "Shopping Mall", icon: ShoppingBag, gradient: "from-cyan-500 to-blue-500", cost: 75, requiredCompletions: 0, unlockRequirement: null, description: "Shop and learn" },
  { id: "meet_blonde", name: "Meet Blonde Girl", icon: Heart, gradient: "from-yellow-500 to-amber-500", cost: 100, requiredCompletions: 0, unlockRequirement: { activity: "mall", count: 1 }, description: "Another special encounter" },
  { id: "breakup", name: "Heartbreak", icon: Heart, gradient: "from-gray-500 to-slate-500", cost: 50, requiredCompletions: 0, unlockRequirement: { bothDates: true }, description: "Life lessons" },
  { id: "journaling", name: "Journaling", icon: BookOpen, gradient: "from-teal-500 to-green-500", cost: 50, requiredCompletions: 0, unlockRequirement: { activity: "breakup", count: 1 }, description: "Self development" },
  { id: "choose_girlfriend", name: "Choose Partner", icon: Users, gradient: "from-red-500 to-pink-500", cost: 200, requiredCompletions: 0, unlockRequirement: { bothDates: true }, description: "Make your choice" },
];

export default function Activities() {
  const queryClient = useQueryClient();
  const [activeExperience, setActiveExperience] = useState(null);
  const [tuxedoDialog, setTuxedoDialog] = useState(false);

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
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, data }) => {
      const existing = activityProgress.find(p => p.activity_id === activityId);
      if (existing) {
        return base44.entities.ActivityProgress.update(existing.id, data);
      }
      return base44.entities.ActivityProgress.create({ activity_id: activityId, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activityProgress'] }),
  });

  const getProgress = (activityId) => activityProgress.find(p => p.activity_id === activityId);
  const coins = userCoins?.coins || 0;
  const unlockedItems = userCoins?.unlocked_items || [];

  const isUnlocked = (activity) => {
    if (!activity.unlockRequirement) return true;
    const req = activity.unlockRequirement;
    
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

  const startActivity = (activity) => {
    if (!isUnlocked(activity)) {
      toast.error("This activity is locked!");
      return;
    }
    if (coins < activity.cost) {
      toast.error("Not enough coins!");
      return;
    }
    updateCoinsMutation.mutate({ coins: coins - activity.cost });
    setActiveExperience(activity);
  };

  const completeActivity = () => {
    if (!activeExperience) return;
    const current = getProgress(activeExperience.id);
    updateActivityMutation.mutate({
      activityId: activeExperience.id,
      data: { completions: (current?.completions || 0) + 1, unlocked: true }
    });
    toast.success(`Completed ${activeExperience.name}!`);
    setActiveExperience(null);

    // Check for tuxedo offer
    if (coins >= 300 && !unlockedItems.includes("tuxedo")) {
      setTimeout(() => setTuxedoDialog(true), 500);
    }
  };

  const buyTuxedo = () => {
    updateCoinsMutation.mutate({
      coins: coins - 300,
      unlocked_items: [...unlockedItems, "tuxedo"]
    });
    setTuxedoDialog(false);
    toast.success("You bought a tuxedo! 🎩");
  };

  if (activeExperience) {
    return <ActivityExperience activity={activeExperience} onComplete={completeActivity} onExit={() => setActiveExperience(null)} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Activities</h1>
            <p className="text-gray-500">Virtual experiences to learn Hebrew</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {activities.map((activity) => {
            const progress = getProgress(activity.id);
            const unlocked = isUnlocked(activity);
            const completions = progress?.completions || 0;

            return (
              <motion.div
                key={activity.id}
                whileHover={{ scale: unlocked ? 1.02 : 1 }}
                className={`relative bg-white rounded-2xl border-2 p-4 text-center transition-all ${
                  unlocked ? 'border-gray-200 hover:shadow-lg cursor-pointer' : 'border-gray-100 opacity-60'
                }`}
                onClick={() => unlocked && startActivity(activity)}
              >
                {!unlocked && (
                  <div className="absolute inset-0 bg-gray-200/50 rounded-2xl flex items-center justify-center">
                    <Lock className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center shadow-lg mb-3`}>
                  <activity.icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{activity.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{activity.description}</p>
                
                {completions > 0 && (
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600 mb-2">
                    <Check className="w-3 h-3" /> {completions}x completed
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-1 text-yellow-600 font-medium text-sm">
                  <Coins className="w-4 h-4" /> {activity.cost}
                </div>
              </motion.div>
            );
          })}
        </div>

        <Dialog open={tuxedoDialog} onOpenChange={setTuxedoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🎩 Special Offer!</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🤵</div>
              <p className="text-gray-600 mb-4">You've earned 300+ coins! Would you like to buy a Tuxedo to unlock the Shabbat Dinner experience?</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setTuxedoDialog(false)}>Maybe Later</Button>
                <Button onClick={buyTuxedo} className="bg-gradient-to-r from-violet-500 to-blue-500">
                  <Coins className="w-4 h-4 mr-2" /> Buy for 300
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}