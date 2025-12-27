import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Edit, Plus, Play, Sparkles, Trash2 } from "lucide-react";
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
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const activeSegmentRef = useRef(null);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

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

  const parseTimestampedTranscript = (text) => {
    const errors = [];
    const lines = text.split('\n').filter(l => l.trim());
    const parsed = [];

    lines.forEach((line, idx) => {
      // Match [MM:SS] Hebrew text or [HH:MM:SS] Hebrew text
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.+)$/);
      
      if (!match) {
        errors.push(`Line ${idx + 1}: Invalid format. Use [MM:SS] Hebrew text`);
        return;
      }

      const [_, min, sec, hour, hebrew] = match;
      const startSeconds = hour 
        ? parseInt(hour) * 3600 + parseInt(min) * 60 + parseInt(sec)
        : parseInt(min) * 60 + parseInt(sec);

      if (!hebrew.trim()) {
        errors.push(`Line ${idx + 1}: Hebrew text is empty`);
        return;
      }

      parsed.push({
        start_time: startSeconds,
        hebrew: hebrew.trim()
      });
    });

    // Validate order
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].start_time <= parsed[i-1].start_time) {
        errors.push(`Line ${i + 1}: Timestamp out of order`);
      }
    }

    return { parsed, errors };
  };

  const saveManualTranscript = async () => {
    if (!manualTranscript.trim()) {
      toast.error("Transcript cannot be empty");
      return;
    }

    const { parsed, errors } = parseTimestampedTranscript(manualTranscript);

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    // Calculate end times
    const blocksWithEnd = parsed.map((block, i) => ({
      ...block,
      end_time: i < parsed.length - 1 ? parsed[i + 1].start_time : block.start_time + 10
    }));

    setGeneratingTranslations(true);
    
    try {
      // Step 1: Add nikud to Hebrew text and generate transliteration/translation
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `For each Hebrew segment, add full nikud (vowel points) if missing, then generate transliteration and English translation.

Hebrew segments:
${blocksWithEnd.map((b, i) => `${i + 1}. ${b.hebrew}`).join('\n')}

For each segment, provide:
1. hebrew_nikud: Hebrew text with full nikud (ניקוד) added. If nikud already exists, preserve it.
2. transliteration: Phonetic Hebrew using Latin characters
3. translation: English translation

CRITICAL: Always output Hebrew WITH nikud. Add vowel points to every word.

Return as array of objects with: hebrew_nikud, transliteration, translation`,
        response_json_schema: {
          type: "object",
          properties: {
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hebrew_nikud: { type: "string" },
                  transliteration: { type: "string" },
                  translation: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Merge AI results with parsed data
      const enriched = blocksWithEnd.map((block, i) => ({
        ...block,
        hebrew: result.segments[i]?.hebrew_nikud || block.hebrew,
        transliteration: result.segments[i]?.transliteration || "",
        translation: result.segments[i]?.translation || ""
      }));

      // Convert to storage format: each line with time in 4th column
      const formatted = enriched.map(b => 
        `${b.transliteration}\t${b.translation}\t${b.hebrew}\t${b.start_time}`
      ).join('\n');

      await base44.entities.Video.update(video.id, {
        transcript_text: formatted,
        transcript_status: "complete",
        transcript_source: "manual",
        transcript_generated_at: new Date().toISOString()
      });

      setVideo(prev => ({
        ...prev,
        transcript_text: formatted,
        transcript_status: "complete",
        transcript_source: "manual"
      }));

      setShowManualInput(false);
      setManualTranscript("");
      toast.success("Transcript saved with nikud and translations!");
    } catch (e) {
      toast.error("Failed to generate transcript");
    }
    
    setGeneratingTranslations(false);
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

  const handlePlaySegment = (idx, timeStr) => {
    if (!onSeekVideo) return;
    
    let seconds = 0;
    
    // Parse time format (MM:SS or just seconds)
    if (timeStr.includes(':')) {
      const [min, sec] = timeStr.split(':').map(Number);
      seconds = (min * 60) + sec;
    } else {
      seconds = parseInt(timeStr);
    }
    
    setActiveSegmentIdx(idx);
    onSeekVideo(seconds);
  };

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeSegmentIdx]);

  const deleteTranscript = async () => {
    if (!confirm('Delete this transcript? This cannot be undone.')) return;
    
    try {
      await base44.entities.Video.update(video.id, {
        transcript_text: null,
        transcript_status: null,
        transcript_source: null,
        language: null
      });

      setVideo(prev => ({
        ...prev,
        transcript_text: null,
        transcript_status: null,
        transcript_source: null,
        language: null
      }));

      toast.success("Transcript deleted");
    } catch (e) {
      toast.error("Failed to delete transcript");
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
            ref={containerRef}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs">
                {video.transcript_source === "youtube_captions" ? "📝 YouTube Captions" : 
                 video.transcript_source === "manual" ? "📝 Manual Transcript" : "📝 Transcript"}
              </span>
              <div className="flex items-center gap-2">
                {video.language && (
                  <span className="text-white/40 text-xs uppercase">{video.language}</span>
                )}
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={deleteTranscript}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Delete transcript"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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
                    const isActive = activeSegmentIdx === blockIdx;
                    const hasTimestamp = parts.length >= 4 && parts[3];
                    
                    return (
                      <div 
                        key={blockIdx} 
                        ref={isActive ? activeSegmentRef : null}
                        className={`group relative p-2 rounded-lg transition-all flex gap-3 ${
                          isActive ? 'bg-yellow-400/20 border-l-4 border-yellow-500 pl-3' : 'hover:bg-white/5'
                        }`}
                      >
                        {onSeekVideo && hasTimestamp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySegment(blockIdx, parts[3].trim());
                            }}
                            className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all mt-0.5 ${
                              isActive 
                                ? 'bg-yellow-500/60 hover:bg-yellow-500/80' 
                                : 'bg-cyan-500/20 hover:bg-cyan-500/40'
                            }`}
                            title="Play this sentence"
                            aria-label="Play this sentence"
                          >
                            <Play className={`w-3 h-3 md:w-4 md:h-4 ${
                              isActive ? 'text-white fill-white' : 'text-cyan-400 fill-cyan-400'
                            }`} />
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
                        <div className="mb-0.5" style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'bidi-override' }}>
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
                        <div className="mb-1" style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'bidi-override' }}>
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
                        <div style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'bidi-override' }}>
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
                                className="text-cyan-400 text-xl font-bold leading-tight"
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
              Paste Hebrew transcript with timestamps (format: [MM:SS] Hebrew text on same line):
            </p>
            <Textarea
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder="[00:00] בוקר טוב מה שלומכם היום נעשה סרטון&#10;[00:06] למתחילים&#10;[00:08] לנשים שלא יודעים עברית"
              className="bg-white/5 border-white/20 text-white min-h-[200px] mb-3"
              dir="rtl"
            />
            <div className="flex gap-2">
              <Button 
                onClick={saveManualTranscript}
                disabled={generatingTranslations}
                className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                {generatingTranslations ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Save & Generate"
                )}
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