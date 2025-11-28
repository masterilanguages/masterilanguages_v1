import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, ArrowLeft, Coins, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";

const videos = [
  { id: 1, title: "Hebrew Basics", thumbnail: "🎬", duration: "5:30", coins: 25, url: "https://youtube.com/watch?v=example1" },
  { id: 2, title: "Common Phrases", thumbnail: "💬", duration: "7:15", coins: 30, url: "https://youtube.com/watch?v=example2" },
  { id: 3, title: "Hebrew Songs", thumbnail: "🎵", duration: "4:45", coins: 20, url: "https://youtube.com/watch?v=example3" },
  { id: 4, title: "Daily Conversations", thumbnail: "🗣️", duration: "8:20", coins: 35, url: "https://youtube.com/watch?v=example4" },
];

export default function Videos() {
  const queryClient = useQueryClient();
  const [watchedVideos, setWatchedVideos] = useState([]);

  const { data: userProfile } = useQuery({
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
      return coins[0] || { coins: 0 };
    },
  });

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const watchVideo = (video) => {
    if (watchedVideos.includes(video.id)) {
      toast.info("Already watched this video");
      return;
    }
    setWatchedVideos([...watchedVideos, video.id]);
    updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + video.coins });
    toast.success(`+${video.coins} coins earned!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Watch & Learn</h1>
            <p className="text-white/60">Earn coins by watching videos</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {videos.map((video) => {
            const isWatched = watchedVideos.includes(video.id);
            return (
              <motion.div
                key={video.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => watchVideo(video)}
                className={`relative bg-white/5 backdrop-blur-xl rounded-2xl border-2 p-6 cursor-pointer transition-all ${
                  isWatched ? 'border-green-500/50' : 'border-white/10 hover:border-cyan-400/50'
                }`}
              >
                {isWatched && (
                  <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
                    {video.thumbnail}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{video.title}</h3>
                    <p className="text-white/60 text-sm">{video.duration}</p>
                    <div className="flex items-center gap-1 text-yellow-400 mt-2">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">+{video.coins}</span>
                    </div>
                  </div>
                  <Play className="w-8 h-8 text-white/40" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}