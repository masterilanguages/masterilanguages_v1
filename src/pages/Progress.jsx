import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Progress() {
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings', userProfile?.language],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank", language: userProfile?.language || 'hebrew' }),
    enabled: !!userProfile,
  });

  const { data: dayProgress = [] } = useQuery({
    queryKey: ['dayProgress'],
    queryFn: () => base44.entities.DayProgress.list(),
  });

  // Build 30-day chart data from real entity timestamps
  const chartData = useMemo(() => {
    const today = new Date();
    const days = [];

    // Index words by creation date
    const wordsByDate = {};
    for (const w of wordRatings) {
      if (!w.created_date) continue;
      const d = new Date(w.created_date).toDateString();
      if (!wordsByDate[d]) wordsByDate[d] = [];
      wordsByDate[d].push(w);
    }

    // Index day completions by date
    const progressByDate = {};
    for (const p of dayProgress) {
      if (!p.created_date && !p.updated_date) continue;
      const d = new Date(p.updated_date || p.created_date).toDateString();
      if (!progressByDate[d]) progressByDate[d] = [];
      progressByDate[d].push(p);
    }

    let runningStreak = 0;
    let runningTotalWords = 0;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const wordsAddedToday = (wordsByDate[dateStr] || []).length;
      const sessionsCompletedToday = (progressByDate[dateStr] || []).length;

      // Running totals for cumulative vocab
      runningTotalWords += wordsAddedToday;

      // Streak: +1 if any activity that day, else reset to 0
      const hadActivity = wordsAddedToday > 0 || sessionsCompletedToday > 0;
      if (hadActivity) {
        runningStreak += 1;
      } else {
        runningStreak = 0;
      }

      days.push({
        day: label,
        streak: runningStreak,
        vocabAdded: wordsAddedToday,
        vocabTotal: runningTotalWords,
        sessionsCompleted: sessionsCompletedToday,
      });
    }

    return days;
  }, [wordRatings, dayProgress]);

  const graphs = [
    {
      title: "Daily Streak",
      description: "Consecutive days with any learning activity",
      dataKey: "streak",
      color: "#ef4444",
      yAxisLabel: "Days",
    },
    {
      title: "Vocab Added Per Day",
      description: "New words added to backpack each day",
      dataKey: "vocabAdded",
      color: "#8b5cf6",
      yAxisLabel: "Words",
    },
    {
      title: "Total Vocabulary",
      description: "Cumulative words in backpack over time",
      dataKey: "vocabTotal",
      color: "#06b6d4",
      yAxisLabel: "Words",
    },
    {
      title: "Sessions Completed",
      description: "Daily sessions/days marked as done",
      dataKey: "sessionsCompleted",
      color: "#10b981",
      yAxisLabel: "Sessions",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">📊 Progress Tracking</h1>
            <p className="text-white/60">Your last 30 days of learning activity</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Current Day', value: userProfile?.current_day || 1 },
            { label: 'Daily Streak 🔥', value: userProfile?.daily_streak || 0 },
            { label: 'Total Words', value: wordRatings.length },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 text-center">
              <p className="text-white/60 text-sm mb-1">{stat.label}</p>
              <p className="text-4xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Words Backpack Summary */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🎒 Words Backpack Summary</h2>
          <div className="flex flex-wrap gap-4 justify-start">
            {[
              { name: 'Total', count: wordRatings.length, color: '#94a3b8' },
              { name: 'New', count: wordRatings.filter(w => (w.times_practiced || 0) === 0).length, color: '#999999' },
              { name: 'Recognized', count: wordRatings.filter(w => (w.times_practiced || 0) > 0 && (w.times_practiced || 0) < 3).length, color: '#dc2626' },
              { name: 'Familiar', count: wordRatings.filter(w => (w.times_practiced || 0) >= 3 && (w.times_practiced || 0) < 5).length, color: '#eab308' },
              { name: 'Mastered', count: wordRatings.filter(w => (w.times_practiced || 0) >= 5).length, color: '#16a34a' },
            ].map((level) => (
              <motion.div
                key={level.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-2">{level.name}</p>
                  <p className="text-4xl font-bold" style={{ color: level.color }}>{level.count}</p>
                </div>
              </motion.div>
            ))}
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

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                    interval={4}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    formatter={(value) => [value, graph.title]}
                  />
                  <Line
                    type="monotone"
                    dataKey={graph.dataKey}
                    stroke={graph.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: graph.color }}
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