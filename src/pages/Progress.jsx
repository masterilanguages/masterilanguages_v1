import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Palette, User, Calendar, CalendarDays, CheckCircle, Award, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import GameHeader from "../components/game/GameHeader";

const scheduleTopics = [
  { title: "Colors", icon: Palette, description: "12 colors", gradient: "from-pink-500 to-rose-500", page: "ColorsLesson", count: 12 },
  { title: "Body Parts", icon: User, description: "18 words", gradient: "from-blue-500 to-cyan-500", page: "BodyPartsLesson", count: 18 },
  { title: "Days of the Week", icon: Calendar, description: "7 days", gradient: "from-violet-500 to-purple-500", page: "DaysLesson", count: 7 },
  { title: "Months", icon: CalendarDays, description: "12 months", gradient: "from-amber-500 to-orange-500", page: "MonthsLesson", count: 12 },
];

export default function Progress() {
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

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
  });

  const getProgress = (lessonName) => lessonProgress.find(p => p.lesson_name === lessonName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Schedule</h1>
            <p className="text-white/60">Complete lessons to earn coins</p>
          </div>
        </div>

        <div className="grid gap-4">
          {scheduleTopics.map((topic, idx) => {
            const progress = getProgress(topic.page);
            return (
              <Link
                key={idx}
                to={createPageUrl(topic.page)}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`relative bg-white/5 backdrop-blur-xl rounded-2xl border-2 p-6 transition-all ${
                    progress?.completed ? 'border-green-500/50' : 'border-white/10 hover:border-cyan-400/50'
                  }`}
                >
                  {progress?.completed && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                  {progress?.test_completed && (
                    <div className="absolute top-4 right-12 bg-yellow-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-bold text-yellow-400">{progress.test_score}%</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center shadow-lg`}>
                      <topic.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{topic.title}</h2>
                      <p className="text-white/60">{topic.description} • {topic.count} words</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}