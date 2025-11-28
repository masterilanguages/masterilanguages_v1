import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Coins, Lock, Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AnimatedParrot from "../components/mascot/AnimatedParrot";

const storeItems = [
  { id: "tennis_racquet", name: "Tennis Racquet", emoji: "🎾", price: 100 },
  { id: "soccer_ball", name: "Soccer Ball", emoji: "⚽", price: 100 },
  { id: "basketball", name: "Basketball", emoji: "🏀", price: 100 },
  { id: "hat", name: "Cool Hat", emoji: "🎩", price: 150 },
  { id: "sunglasses", name: "Sunglasses", emoji: "🕶️", price: 120 },
  { id: "crown", name: "Golden Crown", emoji: "👑", price: 300 },
  { id: "guitar", name: "Guitar", emoji: "🎸", price: 200 },
  { id: "magic_wand", name: "Magic Wand", emoji: "🪄", price: 250 },
  { id: "skateboard", name: "Skateboard", emoji: "🛹", price: 180 },
  { id: "trophy", name: "Trophy", emoji: "🏆", price: 500 },
];

export default function Store() {
  const queryClient = useQueryClient();
  const [trigger, setTrigger] = useState(0);

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      if (coins.length === 0) {
        const created = await base44.entities.UserCoins.create({ coins: 0, unlocked_items: [], equipped_item: null });
        return created;
      }
      return coins[0];
    },
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const buyItem = (item) => {
    if (userCoins.coins < item.price) {
      toast.error("Not enough coins!");
      return;
    }
    if (userCoins.unlocked_items?.includes(item.id)) {
      toast.info("You already own this!");
      return;
    }
    updateCoinsMutation.mutate({
      coins: userCoins.coins - item.price,
      unlocked_items: [...(userCoins.unlocked_items || []), item.id],
    });
    setTrigger(t => t + 1);
    toast.success(`You bought ${item.name}!`);
  };

  const equipItem = (itemId) => {
    const newEquipped = userCoins.equipped_item === itemId ? null : itemId;
    updateCoinsMutation.mutate({ equipped_item: newEquipped });
    toast.success(newEquipped ? "Item equipped!" : "Item unequipped");
  };

  const coins = userCoins?.coins || 0;
  const unlockedItems = userCoins?.unlocked_items || [];
  const equippedItem = userCoins?.equipped_item;
  const equippedItemData = storeItems.find(i => i.id === equippedItem);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">Treasure Store</h1>
              <p className="text-gray-500">Unlock items for your parrot!</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-xl px-4 py-2 flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-700">{coins}</span>
          </div>
        </div>

        {/* Preview with equipped item */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Parrot</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="relative">
              <AnimatedParrot trigger={trigger} size="lg" showMessage={false} />
              {equippedItemData && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 text-4xl"
                >
                  {equippedItemData.emoji}
                </motion.div>
              )}
            </div>
            {equippedItemData && (
              <div className="text-center">
                <p className="text-sm text-gray-500">Equipped:</p>
                <p className="font-medium text-violet-600">{equippedItemData.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {storeItems.map((item) => {
            const isOwned = unlockedItems.includes(item.id);
            const isEquipped = equippedItem === item.id;
            const canAfford = coins >= item.price;

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className={`bg-white rounded-2xl border-2 p-4 text-center transition-all ${
                  isEquipped ? 'border-violet-400 bg-violet-50' : 
                  isOwned ? 'border-green-300 bg-green-50' : 
                  'border-gray-200 hover:border-yellow-300'
                }`}
              >
                <div className="text-5xl mb-3">{item.emoji}</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.name}</h3>
                
                {isOwned ? (
                  <Button
                    size="sm"
                    onClick={() => equipItem(item.id)}
                    className={`w-full mt-2 ${isEquipped ? 'bg-violet-500' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {isEquipped ? <><Check className="w-3 h-3 mr-1" /> Equipped</> : 'Equip'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => buyItem(item)}
                    disabled={!canAfford}
                    className={`w-full mt-2 ${canAfford ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-300'}`}
                  >
                    {canAfford ? (
                      <><Coins className="w-3 h-3 mr-1" /> {item.price}</>
                    ) : (
                      <><Lock className="w-3 h-3 mr-1" /> {item.price}</>
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-r from-violet-100 to-blue-100 rounded-xl p-4 text-center">
          <p className="text-violet-700">💡 <strong>Tip:</strong> Clear all "New Words" to earn 100 coins!</p>
        </div>
      </div>
    </div>
  );
}