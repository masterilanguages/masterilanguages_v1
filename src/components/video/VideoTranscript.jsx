import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VideoTranscript({ videoId, videoUrl }) {
  const [expanded, setExpanded] = useState(false);
  const [video, setVideo] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadVideo();
  }, [videoId, videoUrl]);

  const loadVideo = async () => {
    try {
      const videos = await base44.entities.Video.filter({ video_url: videoUrl });
      if (videos.length > 0) {
        setVideo(videos[0]);
        // If no transcript and not failed, start transcription
        if (!videos[0].transcript_status || videos[0].transcript_status === "failed") {
          startTranscription(videos[0].id);
        }
      } else {
        // Create video entry
        const newVideo = await base44.entities.Video.create({
          video_url: videoUrl,
          title: videoId || "Untitled",
          transcript_status: "processing"
        });
        setVideo(newVideo);
        startTranscription(newVideo.id);
      }
    } catch (e) {
      console.error("Failed to load video", e);
    }
  };

  const startTranscription = async (id) => {
    setTranscribing(true);
    try {
      // Extract YouTube video ID
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
      const ytId = ytMatch ? ytMatch[1] : null;

      if (!ytId) {
        throw new Error("Invalid YouTube URL");
      }

      // Fetch YouTube transcript using public API
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Fetch the YouTube transcript for video ID: ${ytId}
        
        Access the YouTube transcript/captions using any available method (auto-generated or manual captions).
        Look for Hebrew (he, iw) or English captions.
        
        Return the full transcript text with timestamps removed, organized in paragraphs.
        If no captions are available, return: "NO_CAPTIONS_AVAILABLE"`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            language: { type: "string" },
            source: { type: "string" }
          }
        }
      });

      if (result.transcript === "NO_CAPTIONS_AVAILABLE") {
        await base44.entities.Video.update(id, {
          transcript_status: "failed",
          transcript_source: "unavailable",
          youtube_video_id: ytId
        });
        setVideo(prev => ({
          ...prev,
          transcript_status: "failed",
          transcript_source: "unavailable"
        }));
        toast.error("No captions available for this video");
      } else {
        await base44.entities.Video.update(id, {
          transcript_text: result.transcript,
          transcript_status: "complete",
          transcript_source: "youtube_captions",
          language: result.language || "he",
          youtube_video_id: ytId,
          transcript_generated_at: new Date().toISOString()
        });

        setVideo(prev => ({
          ...prev,
          transcript_text: result.transcript,
          transcript_status: "complete",
          transcript_source: "youtube_captions"
        }));
        toast.success("Transcript loaded!");
      }
    } catch (e) {
      console.error("Transcription error:", e);
      await base44.entities.Video.update(id, {
        transcript_status: "failed",
        transcript_source: "unavailable"
      });
      setVideo(prev => ({
        ...prev,
        transcript_status: "failed"
      }));
      toast.error("Transcription failed");
    }
    setTranscribing(false);
  };

  if (!video) return null;

  const isProcessing = video.transcript_status === "processing" || transcribing;
  const hasTranscript = video.transcript_status === "complete" && video.transcript_text;

  return (
    <div className="mt-4">
      <Button
        onClick={() => setExpanded(!expanded)}
        variant="outline"
        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Transcript generating...
          </>
        ) : hasTranscript ? (
          <>
            {expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
            {expanded ? "Hide transcript" : "Show transcript"}
          </>
        ) : (
          "No transcript available"
        )}
      </Button>

      <AnimatePresence>
        {expanded && hasTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4 max-h-96 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs">
                {video.transcript_source === "youtube_captions" ? "📝 YouTube Captions" : "📝 Transcript"}
              </span>
              {video.language && (
                <span className="text-white/40 text-xs uppercase">{video.language}</span>
              )}
            </div>
            <div className="text-white/90 leading-relaxed whitespace-pre-wrap" dir={video.language === "he" || video.language === "iw" ? "rtl" : "ltr"}>
              {video.transcript_text}
            </div>
          </motion.div>
        )}
        {expanded && video.transcript_status === "failed" && video.transcript_source === "unavailable" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center"
          >
            <p className="text-red-400 text-sm">Transcript unavailable for this video.</p>
            <p className="text-white/40 text-xs mt-1">This video doesn't have captions enabled.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}