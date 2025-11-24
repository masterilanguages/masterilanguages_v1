import React from "react";
import { Play } from "lucide-react";
import YouTubePlayer from "../components/practice/YouTubePlayer";

export default function Videos() {
  const videos = [
    {
      title: "Hebrew Vocabulary - Laazor (Help)",
      url: "https://www.youtube.com/watch?v=BmbmaWQJu18",
      description: "Learn the Hebrew word for 'help' - לעזור (laazor)"
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Video Lessons
          </h1>
          <p className="text-gray-500">Watch and learn Hebrew pronunciation</p>
        </div>

        <div className="space-y-6">
          {videos.map((video, idx) => (
            <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{video.title}</h2>
                <p className="text-gray-500 mb-4">{video.description}</p>
                <YouTubePlayer url={video.url} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}