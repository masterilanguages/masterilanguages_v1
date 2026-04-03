import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import GameHeader from "../components/game/GameHeader";

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

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const { data: dayProgress = [] } = useQuery({
    queryKey: ['dayProgress'],
    queryFn: () => base44.entities.DayProgress.list(),
  });

  // Generate 30-day data
  const generateChartData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Mock data based on patterns - in production, calculate from actual user data
      const dayNum = 30 - i;
      
      data.push({
        day: dayStr,
        streak: dayNum === 3 ? 0 : Math.min(dayNum, 30), // Streak resets on day 3
        attendance: Math.max(0, 100 - (dayNum === 3 ? 20 : 0) - Math.random() * 5), // Drops on day 3
        completion: 70 + Math.sin(dayNum / 5) * 15 + Math.random() * 10, // Varies
        timeInvested: 2 + Math.sin(dayNum / 7) * 1 + Math.random() * 0.5, // Hours per day
        vocabAdded: dayNum % 3 === 0 ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 3), // Words added
        vocabProgress: dayNum % 2 === 0 ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 5), // Words progressed
      });
    }
    return data;
  };

  const chartData = useMemo(() => generateChartData(), []);

  const graphs = [
    {
      title: "Streak",
      description: "Daily login consistency",
      dataKey: "streak",
      color: "#ef4444",
      yAxisLabel: "Days",
      unit: "",
    },
    {
      title: "Attendance",
      description: "Daily login percentage",
      dataKey: "attendance",
      color: "#3b82f6",
      yAxisLabel: "Points",
      unit: "",
    },
    {
      title: "Completion",
      description: "Session completion rate",
      dataKey: "completion",
      color: "#10b981",
      yAxisLabel: "Score",
      unit: "",
    },
    {
      title: "Time Invested",
      description: "Hours practiced per day",
      dataKey: "timeInvested",
      color: "#f59e0b",
      yAxisLabel: "Hours",
      unit: "h",
    },
    {
      title: "Vocab Added",
      description: "Words added to backpack",
      dataKey: "vocabAdded",
      color: "#8b5cf6",
      yAxisLabel: "Words",
      unit: "",
    },
    {
      title: "Vocabulary Progress",
      description: "Words learned/progressed",
      dataKey: "vocabProgress",
      color: "#06b6d4",
      yAxisLabel: "Words",
      unit: "",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">📊 Progress Tracking</h1>
            <p className="text-white/60">Monitor your learning development over the last 30 days</p>
          </div>
        </div>

        {/* Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {graphs.map((graph, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{graph.title}</h3>
                <p className="text-white/50 text-sm">{graph.description}</p>
              </div>

              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fontSize: 11 }}
                    interval={4}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fontSize: 11 }}
                    label={{ value: graph.yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.5)', fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(1) : value,
                      graph.title,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey={graph.dataKey}
                    stroke={graph.color}
                    strokeWidth={2.5}
                    dot={{ fill: graph.color, r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}