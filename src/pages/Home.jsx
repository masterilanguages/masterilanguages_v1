import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Palette, User, Calendar, CalendarDays, CheckCircle, Award, ArrowRight, Sparkles, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import AnimatedParrot from "../components/mascot/AnimatedParrot";

const scheduleTopics = [
  { title: "Colors", icon: Palette, description: "12 colors", gradient: "from-pink-500 to-rose-500", page: "ColorsLesson", count: 12, time: "5 min" },
  { title: "Body Parts", icon: User, description: "18 words", gradient: "from-blue-500 to-cyan-500", page: "BodyPartsLesson", count: 18, time: "8 min" },
  { title: "Days of the Week", icon: Calendar, description: "7 days", gradient: "from-violet-500 to-purple-500", page: "DaysLesson", count: 7, time: "4 min" },
  { title: "Months", icon: CalendarDays, description: "12 months", gradient: "from-amber-500 to-orange-500", page: "MonthsLesson", count: 12, time: "5 min" },
];

export default function Home() {
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
  });

  const { data: wordsWithImages = [] } = useQuery({
    queryKey: ['wordsWithImages'],
    queryFn: async () => {
      const words = await base44.entities.Word.list("-created_date", 50);
      return words.filter(w => w.image_url);
    },
  });

  const getProgress = (lessonName) => lessonProgress.find(p => p.lesson_name === lessonName);
  const completedCount = lessonProgress.filter(p => p.completed).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <AnimatedParrot trigger={0} size="md" showMessage={false} />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Welcome Back!
              </h1>
              <p className="text-gray-500 text-lg">Your learning journey continues</p>
            </div>
          </div>
        </motion.div>

        {/* Today's Plan Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Today's Plan</h2>
              <p className="text-gray-500 text-sm">{completedCount}/{scheduleTopics.length} completed • ~22 min total</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg p-4 md:p-6">
            <div className="space-y-3">
              {scheduleTopics.map((topic, idx) => {
                const progress = getProgress(topic.page);
                const isCompleted = progress?.completed;
                
                return (
                  <Link
                    key={idx}
                    to={createPageUrl(topic.page)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md group ${
                      isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-violet-50 border border-transparent hover:border-violet-200'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold text-sm">
                      {isCompleted ? <CheckCircle className="w-5 h-5 text-green-600" /> : idx + 1}
                    </div>
                    
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <topic.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-800'}`}>
                        {topic.title}
                      </h3>
                      <p className="text-gray-500 text-sm">{topic.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {progress?.test_completed && (
                        <div className="bg-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs font-bold text-yellow-700">{progress.test_score}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {topic.time}
                      </div>
                      <ArrowRight className={`w-5 h-5 ${isCompleted ? 'text-green-500' : 'text-gray-400 group-hover:text-violet-500'} transition-colors`} />
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              to={createPageUrl("Practice")}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
            >
              Continue Learning <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        {/* Mnemonic Gallery Section */}
        {wordsWithImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Your Memory Palace</h2>
                <p className="text-gray-500 text-sm">{wordsWithImages.length} mnemonics created</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {wordsWithImages.slice(0, 8).map((word, idx) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * idx }}
                  className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <img 
                    src={word.image_url} 
                    alt={word.phonetic}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="font-bold text-lg">{word.phonetic}</p>
                    <p className="text-white/80 text-sm">{word.translation}</p>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
                    <p className="text-xs font-medium text-violet-600">{word.phonetic}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {wordsWithImages.length > 8 && (
              <Link
                to={createPageUrl("Practice")}
                className="mt-4 flex items-center justify-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
              >
                View all {wordsWithImages.length} mnemonics <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}