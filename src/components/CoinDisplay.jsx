import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Coins, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const coinPackages = [
  { coins: 1000, price: "$0.99", emoji: "💰" },
  { coins: 5000, price: "$3.99", emoji: "💎" },
  { coins: 15000, price: "$9.99", emoji: "👑" },
  { coins: 50000, price: "$24.99", emoji: "🏆" },
];

export default function CoinDisplay() {
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const coins = await base44.entities.UserCoins.filter({ created_by: currentUser.email });
      if (coins.length === 0) {
        return await base44.entities.UserCoins.create({ coins: 100000000, unlocked_items: [], equipped_item: null });
      }
      return coins[0];
    },
    enabled: !!currentUser?.email,
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
    onError: (e) => { console.error("CoinDisplay: failed to update coins", e); toast.error("Couldn't update your coins. Please try again."); },
  });

  const buyCoins = (amount) => {
    updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + amount });
    toast.success(`Added ${amount.toLocaleString()} coins!`);
    setShowBuyDialog(false);
  };

  const coins = userCoins?.coins || 0;
  const formattedCoins = coins >= 1000000 
    ? `${(coins / 1000000).toFixed(1)}M` 
    : coins >= 1000 
      ? `${(coins / 1000).toFixed(1)}K` 
      : coins.toString();

  return (
    <>
      <button
        onClick={() => setShowBuyDialog(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <Banknote className="w-5 h-5" />
        <span className="font-bold">{formattedCoins}</span>
        <Plus className="w-4 h-4 ml-1" />
      </button>

      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" /> Buy Coins
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">Skip the grind and unlock activities instantly!</p>
            {coinPackages.map((pkg, idx) => (
              <button
                key={idx}
                onClick={() => buyCoins(pkg.coins)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl hover:border-yellow-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{pkg.emoji}</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{pkg.coins.toLocaleString()} Coins</p>
                    <p className="text-xs text-gray-500">Best for unlocking activities</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">{pkg.price}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}