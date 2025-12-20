import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Edit, Plus, Play, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import EditableWord from "../learning/EditableWord";
import ClickableWord from "../learning/ClickableWord";
import UniversalEditableWord from "../learning/UniversalEditableWord";
import EditableSentence from "../learning/EditableSentence";
import VideoTranscriptWord from "./VideoTranscriptWord";

export default function VideoTranscript({ videoId, videoUrl, onPauseVideo, onSeekVideo }) {
  const [expanded, setExpanded] = useState(false);
  const [video, setVideo] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [showHebrewInput, setShowHebrewInput] = useState(false);
  const [hebrewText, setHebrewText] = useState("");
  const [generatingTranslations, setGeneratingTranslations] = useState(false);
  const queryClient = useQueryClient();

  const addToBackpackMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Added to backpack! 🎒");
    },
  });

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

  const generateTranscript = async () => {
    if (!hebrewText.trim()) {
      toast.error("Please paste Hebrew text");
      return;
    }

    setGeneratingTranslations(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You have Hebrew text. Generate transliteration and English translation for each sentence.

Hebrew text:
${hebrewText}

For each sentence, provide:
1. Transliteration (phonetic Hebrew using Latin characters)
2. English translation
3. Original Hebrew

Format as array of objects with: transliteration, english, hebrew`,
        response_json_schema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  transliteration: { type: "string" },
                  english: { type: "string" },
                  hebrew: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Format as: Transliteration\tEnglish\tHebrew (one line per sentence)
      const formatted = result.sentences.map(s => 
        `${s.transliteration}\t${s.english}\t${s.hebrew}`
      ).join('\n');

      await base44.entities.Video.update(video.id, {
        transcript_text: formatted,
        transcript_status: "complete",
        transcript_source: "manual",
        language: "he",
        transcript_generated_at: new Date().toISOString()
      });

      setVideo(prev => ({
        ...prev,
        transcript_text: formatted,
        transcript_status: "complete",
        transcript_source: "manual",
        language: "he"
      }));

      setShowHebrewInput(false);
      setHebrewText("");
      toast.success("Transcript generated with translations!");
    } catch (e) {
      toast.error("Failed to generate transcript");
    }
    setGeneratingTranslations(false);
  };

  const updateTranscriptLine = async (blockIdx, lineType, newValue) => {
    const blocks = video.transcript_text.split('\n\n').filter(b => b.trim());
    const block = blocks[blockIdx];
    const lines = block.trim().split('\n').filter(l => l.trim());
    
    const lineIndex = lineType === 'hebrew' ? 0 : lineType === 'transliteration' ? 1 : 2;
    lines[lineIndex] = newValue;
    
    blocks[blockIdx] = lines.join('\n');
    const newTranscript = blocks.join('\n\n');
    
    try {
      await base44.entities.Video.update(video.id, {
        transcript_text: newTranscript
      });
      setVideo(prev => ({ ...prev, transcript_text: newTranscript }));
      toast.success("Updated!");
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const addSentenceToBackpack = (hebrew, transliteration, english) => {
    addToBackpackMutation.mutate({
      word: hebrew,
      translation: english,
      phonetic: transliteration,
      category: "wordbank",
      times_practiced: 1,
      mastered: false,
    });
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
            onClick={() => setShowHebrewInput(!showHebrewInput)}
            variant="outline"
            className="bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Paste Hebrew
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
                // Parse transcript: each line has tab-separated transliteration, english, hebrew
                const lines = video.transcript_text.split('\n').filter(l => l.trim());
                
                return lines.map((line, blockIdx) => {
                  const parts = line.split('\t');
                  
                  // If we have exactly 3 parts, treat as Translit/English/Hebrew
                  if (parts.length >= 3) {
                    const [transliteration, english, hebrew] = parts;
                    return (
                      <div key={blockIdx} className="group relative p-2 rounded-lg hover:bg-white/5 transition-all flex gap-2">
                        {onSeekVideo && parts.length >= 4 && parts[3] && (
                          <button
                            onClick={() => {
                              const timeStr = parts[3].trim();
                              let seconds = 0;
                              
                              // Parse time format (MM:SS or just seconds)
                              if (timeStr.includes(':')) {
                                const [min, sec] = timeStr.split(':').map(Number);
                                seconds = (min * 60) + sec;
                              } else {
                                seconds = parseInt(timeStr);
                              }
                              
                              onSeekVideo(seconds);
                            }}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 flex items-center justify-center transition-all mt-1"
                            title={`Play from ${parts[3]}`}
                          >
                            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                          </button>
                        )}
                        <div className="flex-1 relative">
                        <button
                          onClick={() => addSentenceToBackpack(hebrew, transliteration, english)}
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center"
                          title="Add to backpack"
                        >
                          <Plus className="w-4 h-4 text-amber-400" />
                        </button>
                        <div className="mb-0.5" style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}>
                          {transliteration.split(/(\s+)/).map((part, i) => 
                            /\S/.test(part) ? (
                              <VideoTranscriptWord
                                key={i}
                                word={part}
                                hebrew={hebrew}
                                transliteration={transliteration}
                                english={english}
                                onEdit={(newWord) => {
                                  const newText = transliteration.split(/(\s+)/).map((p, idx) => idx === i ? newWord : p).join('');
                                  updateTranscriptLine(blockIdx, 'transliteration', newText);
                                }}
                                onAddToBackpack={addSentenceToBackpack}
                                className="text-white/90 text-lg leading-tight"
                              />
                            ) : part
                          )}
                        </div>
                        <div className="mb-1" style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}>
                          {english.split(/(\s+)/).map((part, i) => 
                            /\S/.test(part) ? (
                              <VideoTranscriptWord
                                key={i}
                                word={part}
                                hebrew={hebrew}
                                transliteration={transliteration}
                                english={english}
                                onEdit={(newWord) => {
                                  const newText = english.split(/(\s+)/).map((p, idx) => idx === i ? newWord : p).join('');
                                  updateTranscriptLine(blockIdx, 'english', newText);
                                }}
                                onAddToBackpack={addSentenceToBackpack}
                                className="text-white/70 text-base leading-tight"
                              />
                            ) : part
                          )}
                        </div>
                        <div style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}>
                          {hebrew.split(/(\s+)/).map((part, i) => 
                            /\S/.test(part) ? (
                              <VideoTranscriptWord
                                key={i}
                                word={part}
                                hebrew={hebrew}
                                transliteration={transliteration}
                                english={english}
                                onEdit={(newWord) => {
                                  const newText = hebrew.split(/(\s+)/).map((p, idx) => idx === i ? newWord : p).join('');
                                  updateTranscriptLine(blockIdx, 'hebrew', newText);
                                }}
                                onAddToBackpack={addSentenceToBackpack}
                                className="text-cyan-400 text-2xl font-bold leading-tight"
                              />
                            ) : part
                          )}
                        </div>
                        </div>
                        </div>
                    );
                  }
                  
                  // Fallback: display as plain text
                  return (
                    <div 
                      key={blockIdx}
                      className="text-white/90"
                      style={{ 
                        direction: video.language === "he" || video.language === "iw" ? 'rtl' : 'ltr',
                        textAlign: 'left'
                      }}
                    >
                      {line}
                    </div>
                  );
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
          </motion.div>
        )}

        {showHebrewInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4"
          >
            <p className="text-white/60 text-sm mb-2">
              ✨ Paste Hebrew text - I'll auto-generate transliteration & translation:
            </p>
            <Textarea
              value={hebrewText}
              onChange={(e) => setHebrewText(e.target.value)}
              placeholder="שָׁלוֹם לְכֻלָּם!&#10;הַיּוֹם נִלְמַד עִבְרִית.&#10;אֲנִי אוֹהֵב לִלְמוֹד שְׂפוֹת."
              className="bg-white/5 border-white/20 text-white min-h-[200px] mb-3"
              dir="rtl"
            />
            <div className="flex gap-2">
              <Button 
                onClick={generateTranscript}
                disabled={generatingTranslations}
                className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                {generatingTranslations ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Transcript
                  </>
                )}
              </Button>
              <Button 
                onClick={() => { setShowHebrewInput(false); setHebrewText(""); }}
                variant="outline"
                className="border-white/20 text-white/60"
              >
                Cancel
              </Button>
            </div>
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
              Paste transcript below (format: each line has Transliteration[TAB]English[TAB]Hebrew):
            </p>
            <Textarea
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder="Shalom lekulam!	Hello everyone!	שָׁלוֹם לְכֻלָּם!&#10;Hayom nilmad Ivrit.	Today we will learn Hebrew.	הַיּוֹם נִלְמַד עִבְרִית."
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