import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Trash2, ChevronDown, ChevronUp, Video as VideoIcon, Backpack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import VideoTranscript from "../components/video/VideoTranscript";
import EditableText from "../components/EditableText";




export default function Home() {
  const queryClient = useQueryClient();
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [expandedVideoId, setExpandedVideoId] = useState(null);

  const { data: videos = [] } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list(),
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const createVideoMutation = useMutation({
    mutationFn: (video) => base44.entities.Video.create(video),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setCustomVideoUrl("");
      toast.success("Video added! 🎬");
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.Video.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success("Video removed");
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Video.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success("Video updated");
    },
  });

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
    return match ? match[1] : null;
  };

  const addVideo = () => {
    if (!customVideoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    const ytId = extractYouTubeId(customVideoUrl);
    if (!ytId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    createVideoMutation.mutate({
      video_url: customVideoUrl,
      title: `Video ${videos.length + 1}`,
      youtube_video_id: ytId
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <EditableText 
                value="Learn Languages with Video"
                onSave={(newValue) => toast.success(`Title would be: ${newValue}`)}
                className="text-3xl font-bold text-white"
              />
            </h1>
            <p className="text-white/60 text-sm mt-1">
              <EditableText 
                value="Watch videos, click words in transcripts, save to your backpack"
                onSave={(newValue) => toast.success(`Subtitle would be: ${newValue}`)}
                className="text-white/60 text-sm"
              />
            </p>
          </div>
          <Button
            onClick={() => window.location.href = createPageUrl("Backpack")}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30"
          >
            <Backpack className="w-5 h-5 mr-2" />
            Backpack ({wordRatings.length})
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Add Video Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <VideoIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-bold text-lg">
              <EditableText 
                value="Add a YouTube Video"
                onSave={(newValue) => toast.success(`Section title would be: ${newValue}`)}
                className="text-white font-bold text-lg"
              />
            </h2>
          </div>
          <div className="flex gap-3">
            <Input
              value={customVideoUrl}
              onChange={(e) => setCustomVideoUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="flex-1 bg-slate-800 border-white/30 text-white placeholder:text-white/50"
              onKeyPress={(e) => e.key === 'Enter' && addVideo()}
            />
            <Button
              onClick={addVideo}
              disabled={!customVideoUrl.trim() || createVideoMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Video
            </Button>
          </div>
        </div>

        {/* Video List */}
        <div className="space-y-4">
          {videos.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <VideoIcon className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No videos yet</p>
              <p className="text-white/40 text-sm mt-1">Add a YouTube video above to get started</p>
            </div>
          ) : (
            videos.map((video) => {
              const ytId = extractYouTubeId(video.video_url);
              const isExpanded = expandedVideoId === video.id;

              return (
                <div
                  key={video.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Video Header */}
                  <div className="flex gap-4 p-4">
                    <div className="relative w-48 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                      {ytId && (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">
                        <EditableText 
                          value={video.title}
                          onSave={(newTitle) => updateVideoMutation.mutate({ id: video.id, data: { title: newTitle } })}
                          className="text-white font-bold text-lg"
                          placeholder="Video title..."
                        />
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setExpandedVideoId(isExpanded ? null : video.id)}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                          {isExpanded ? "Hide" : "Show"} Video & Transcript
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm("Remove this video?")) {
                              deleteVideoMutation.mutate(video.id);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-white/10 p-4 bg-slate-800/50"
                      >
                        {/* Video Player */}
                        {ytId && (
                          <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${ytId}`}
                              title={video.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Transcript Component */}
                        <VideoTranscript videoId={video.id} videoUrl={video.video_url} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}