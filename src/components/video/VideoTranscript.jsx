import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function VideoTranscript({ videoId, videoUrl }) {
  const [expanded, setExpanded] = useState(false);
  const [video, setVideo] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
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

      // Call backend function to list available captions
      const listResponse = await fetch('/api/youtube/captions/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          youtube_url: videoUrl,
          preferred_langs: ['he', 'iw', 'en']
        })
      });

      if (!listResponse.ok) {
        throw new Error('Failed to fetch caption tracks');
      }

      const { video_id, tracks } = await listResponse.json();

      if (!tracks || tracks.length === 0) {
        // No captions available - update status and allow manual input
        await base44.entities.Video.update(id, {
          transcript_status: "failed",
          transcript_source: "unavailable",
          youtube_video_id: ytId
        });
        setVideo(prev => ({
          ...prev,
          transcript_status: "failed",
          transcript_source: "unavailable",
          youtube_video_id: ytId
        }));
        toast.error("No captions available - you can add manually");
        setTranscribing(false);
        return;
      }

      // Use the first available track (already sorted by preference)
      const selectedTrack = tracks[0];

      // Download the caption track
      const downloadResponse = await fetch('/api/youtube/captions/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          video_id: ytId,
          track_id: selectedTrack.track_id
        })
      });

      if (!downloadResponse.ok) {
        throw new Error('Failed to download captions');
      }

      const { transcript_text, format } = await downloadResponse.json();

      // Save to database
      await base44.entities.Video.update(id, {
        transcript_text,
        transcript_status: "complete",
        transcript_source: "youtube_captions",
        language: selectedTrack.language,
        youtube_video_id: ytId,
        caption_track_id: selectedTrack.track_id,
        transcript_generated_at: new Date().toISOString()
      });

      setVideo(prev => ({
        ...prev,
        transcript_text,
        transcript_status: "complete",
        transcript_source: "youtube_captions",
        language: selectedTrack.language
      }));
      
      toast.success("Transcript loaded from YouTube captions!");

    } catch (e) {
      console.error("Transcription error:", e);
      
      // Extract video ID for fallback
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
      const ytId = ytMatch ? ytMatch[1] : null;
      
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
      toast.error("Caption fetch failed - add transcript manually");
    }
    setTranscribing(false);
  };

  const saveManualTranscript = async () => {
    if (!manualTranscript.trim()) {
      toast.error("Transcript cannot be empty");
      return;
    }

    try {
      await base44.entities.Video.update(video.id, {
        transcript_text: manualTranscript,
        transcript_status: "complete",
        transcript_source: "manual",
        transcript_generated_at: new Date().toISOString()
      });

      setVideo(prev => ({
        ...prev,
        transcript_text: manualTranscript,
        transcript_status: "complete",
        transcript_source: "manual"
      }));

      setShowManualInput(false);
      setManualTranscript("");
      toast.success("Manual transcript saved!");
    } catch (e) {
      toast.error("Failed to save transcript");
    }
  };

  if (!video) return null;

  const isProcessing = video.transcript_status === "processing" || transcribing;
  const hasTranscript = video.transcript_status === "complete" && video.transcript_text;

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <Button
          onClick={() => setExpanded(!expanded)}
          variant="outline"
          className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Fetching captions...
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
        
        {video?.transcript_status === "failed" && (
          <Button
            onClick={() => setShowManualInput(!showManualInput)}
            variant="outline"
            className="bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
          >
            <Edit className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
        )}
      </div>

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
                {video.transcript_source === "youtube_captions" ? "📝 YouTube Captions" : 
                 video.transcript_source === "manual" ? "📝 Manual Transcript" : "📝 Transcript"}
              </span>
              {video.language && (
                <span className="text-white/40 text-xs uppercase">{video.language}</span>
              )}
            </div>
            <div className="space-y-6">
              {(() => {
                // Parse transcript in blocks of 3 lines: Hebrew, Transliteration, English
                const blocks = video.transcript_text.split('\n\n').filter(b => b.trim());
                
                return blocks.map((block, blockIdx) => {
                  const lines = block.trim().split('\n').filter(l => l.trim());
                  
                  // If we have exactly 3 lines, treat as Hebrew/Translit/English
                  if (lines.length >= 3) {
                    const [hebrew, transliteration, english] = lines;
                    return (
                      <div key={blockIdx} className="space-y-1">
                        <p 
                          className="text-cyan-400 text-2xl font-bold leading-tight" 
                          dir="rtl" 
                          style={{ textAlign: 'left' }}
                        >
                          {hebrew}
                        </p>
                        <p className="text-white/90 text-lg leading-tight">
                          {transliteration}
                        </p>
                        <p className="text-white/70 text-base leading-tight">
                          {english}
                        </p>
                      </div>
                    );
                  }
                  
                  // Fallback: display as plain text
                  return lines.map((line, lineIdx) => (
                    <div 
                      key={`${blockIdx}-${lineIdx}`}
                      className="text-white/90"
                      style={{ 
                        direction: video.language === "he" || video.language === "iw" ? 'rtl' : 'ltr',
                        textAlign: 'left'
                      }}
                    >
                      {line}
                    </div>
                  ));
                });
              })()}
            </div>
          </motion.div>
        )}
        
        {expanded && video?.transcript_status === "failed" && video?.transcript_source === "unavailable" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center"
          >
            <p className="text-red-400 text-sm">Transcript unavailable for this video.</p>
            <p className="text-white/40 text-xs mt-1">This video doesn't have captions enabled.</p>
            <Button 
              onClick={() => setShowManualInput(true)}
              className="mt-3 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              size="sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Add Transcript Manually
            </Button>
          </motion.div>
        )}

        {showManualInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <p className="text-white/60 text-sm mb-2">
              Paste transcript below (format: Hebrew line, Transliteration line, English line, blank line, repeat):
            </p>
            <Textarea
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder="שָׁלוֹם לְכֻלָּם!&#10;Shalom lekulam!&#10;Hello everyone!&#10;&#10;הַיּוֹם נִלְמַד עִבְרִית.&#10;Hayom nilmad Ivrit.&#10;Today we will learn Hebrew."
              className="bg-white/5 border-white/20 text-white min-h-[200px] mb-3"
            />
            <div className="flex gap-2">
              <Button 
                onClick={saveManualTranscript}
                className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                Save Transcript
              </Button>
              <Button 
                onClick={() => { setShowManualInput(false); setManualTranscript(""); }}
                variant="outline"
                className="border-white/20 text-white/60"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}