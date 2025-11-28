import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Palette, User, Calendar, CalendarDays, CheckCircle, Award } from "lucide-react";
import ParrotMascot from "../components/mascot/ParrotMascot";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const scheduleTopics = [
  { title: "Colors", icon: Palette, description: "12 colors: adom, kachol, yarok...", gradient: "from-pink-500 to-rose-500", page: "ColorsLesson", count: 12 },
  { title: "Body Parts", icon: User, description: "18 words: rosh, yad, regel...", gradient: "from-blue-500 to-cyan-500", page: "BodyPartsLesson", count: 18 },
  { title: "Days of the Week", icon: Calendar, description: "7 days: yom rishon, shabbat...", gradient: "from-violet-500 to-purple-500", page: "DaysLesson", count: 7 },
  { title: "Months of the Year", icon: CalendarDays, description: "12 months: yanuar, februar...", gradient: "from-amber-500 to-orange-500", page: "MonthsLesson", count: 12 },
];

export default function Progress() {
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
  });

  const getProgress = (lessonName) => {
    return lessonProgress.find(p => p.lesson_name === lessonName);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <ParrotMascot size="sm" message="Pick a topic to learn!" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Schedule
            </h1>
            <p className="text-gray-500">Choose a topic to practice</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {scheduleTopics.map((topic, idx) => {
                          const progress = getProgress(topic.page);
                          return (
                            <Link
                              key={idx}
                              to={createPageUrl(topic.page)}
                              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg p-6 hover:shadow-xl transition-all hover:scale-[1.02] group relative"
                            >
                              {progress?.completed && (
                                <div className="absolute top-3 right-3">
                                  <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                              )}
                              {progress?.test_completed && (
                                <div className="absolute top-3 right-10 bg-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
                                  <Award className="w-4 h-4 text-yellow-600" />
                                  <span className="text-xs font-bold text-yellow-700">{progress.test_score}%</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                  <topic.icon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                  <h2 className="text-xl font-bold text-gray-800">{topic.title}</h2>
                                  <p className="text-gray-500 text-sm">{topic.description}</p>
                                  <span className="text-xs text-gray-400">{topic.count} words</span>
                                  {progress?.completed && !progress?.test_completed && (
                                    <span className="ml-2 text-xs text-green-600 font-medium">✓ Ready for test</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
      </div>
    </div>
  );
}