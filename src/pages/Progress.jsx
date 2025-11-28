import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Palette, User, Calendar, CalendarDays } from "lucide-react";
import ParrotMascot from "../components/mascot/ParrotMascot";

const scheduleTopics = [
  { title: "Colors", icon: Palette, description: "Learn the colors in Hebrew", gradient: "from-pink-500 to-rose-500", page: "ColorsLesson" },
  { title: "Body Parts", icon: User, description: "Learn body parts in Hebrew", gradient: "from-blue-500 to-cyan-500", page: "BodyPartsLesson" },
  { title: "Days of the Week", icon: Calendar, description: "Learn the days in Hebrew", gradient: "from-violet-500 to-purple-500", page: "DaysLesson" },
  { title: "Months of the Year", icon: CalendarDays, description: "Learn the months in Hebrew", gradient: "from-amber-500 to-orange-500", page: "MonthsLesson" },
];

export default function Progress() {
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
          {scheduleTopics.map((topic, idx) => (
            <Link
              key={idx}
              to={createPageUrl(topic.page)}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg p-6 hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${topic.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <topic.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{topic.title}</h2>
                  <p className="text-gray-500 text-sm">{topic.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}