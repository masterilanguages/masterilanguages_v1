import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search, Filter, Video, Users, Play, Loader2, ChevronDown, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import EditableWord from "../components/learning/EditableWord";
import ClickableTranscriptText from "../components/learning/ClickableTranscriptText";
import TranslatorWidget from "../components/TranslatorWidget";
import MediaLibraryHeader from "../components/MediaLibraryHeader";
import ContinuousTranscript from "../components/video/ContinuousTranscript";

const topics = [
  "Religion / Spirituality",
  "Sports / Fitness",
  "Cooking / Food",
  "Nutrition",
  "Health / Wellness",
  "Meditation / Mindfulness",
  "Music",
  "Travel",
  "Culture",
  "Education / Learning",
  "Business / Career",
  "Personal Growth",
  "Relationships",
  "News / Current Events"
];

export default function MediaLibrary() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [videoPlayer, setVideoPlayer] = useState(null);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [editingWords, setEditingWords] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [pastedTranscript, setPastedTranscript] = useState("");
  const [mediaType, setMediaType] = useState("video");
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    language: "hebrew",
    video_url: "",
    video_id: "",
    topics: [],
    difficulty_level: "All",
    duration_minutes: "",
    tags: "",
    speaking_speed: "Normal",
    accent_region: "",
    suitable_for_journaling: false,
    suitable_for_speaking: false,
    is_active: true,
    thumbnail_url: "",
    notes: "",
    default_day: "",
    transcript_phonetics: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
    document.title = "Media Library - Lashon Languages";
  }, []);

  const { data: videos = [] } = useQuery({
    queryKey: ['mediaLibrary'],
    queryFn: () => base44.entities.MediaLibrary.list(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || null;
    },
  });

  const { data: allVideosData = [] } = useQuery({
    queryKey: ['allVideos'],
    queryFn: () => base44.entities.Video.list(),
  });

  const { data: userVideos = [] } = useQuery({
    queryKey: ['userVideos'],
    queryFn: async () => {
      const videos = await base44.entities.Video.list();
      return videos
        .filter(v => !v.deleted_at && v.is_active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  });

  const { data: myProgram = [] } = useQuery({
    queryKey: ['myProgram'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.UserProgram.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
  });

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Added to backpack! 🎒");
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'coach') return [];
      return await base44.entities.User.list();
    },
    enabled: currentUser?.role === 'admin' || currentUser?.role === 'coach',
  });

  const createVideoMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaLibrary.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      setShowAddDialog(false);
      resetForm();
      toast.success("Video added to library!");
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaLibrary.update(id, data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      const updatedVideo = await base44.entities.MediaLibrary.filter({ id: variables.id });
      setEditingVideo(null);
      setShowAddDialog(false);
      resetForm();
      toast.success("Video updated!");
      
      // Open transcript view for the updated video
      if (updatedVideo[0]) {
        handleVideoClick(updatedVideo[0]);
      }
    },
  });

  const saveTranscriptEdit = async (segmentIdx, field, value) => {
    if (!selectedVideo) return;
    const updatedTranscript = [...transcript];
    updatedTranscript[segmentIdx] = { ...updatedTranscript[segmentIdx], [field]: value };
    setTranscript(updatedTranscript);

    await updateVideoMutation.mutateAsync({
      id: selectedVideo.id,
      data: { processed_transcript: updatedTranscript }
    });
  };

  const toggleApproval = async (segmentIdx) => {
    if (!selectedVideo) return;
    const updatedTranscript = [...transcript];
    updatedTranscript[segmentIdx] = {
      ...updatedTranscript[segmentIdx],
      approved: !updatedTranscript[segmentIdx].approved
    };
    setTranscript(updatedTranscript);

    await updateVideoMutation.mutateAsync({
      id: selectedVideo.id,
      data: { processed_transcript: updatedTranscript }
    });
  };

  const deleteSegment = async (segmentIdx) => {
    if (!selectedVideo || !confirm("Delete this segment?")) return;
    const updatedTranscript = transcript.filter((_, idx) => idx !== segmentIdx);
    setTranscript(updatedTranscript);

    await updateVideoMutation.mutateAsync({
      id: selectedVideo.id,
      data: { processed_transcript: updatedTranscript }
    });
    toast.success("Segment deleted");
  };

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      toast.success("Video deleted from library");
    },
  });

  const addToLibraryMutation = useMutation({
    mutationFn: async (video) => {
      const videoId = video.youtube_video_id || extractYouTubeId(video.video_url);
      return base44.entities.MediaLibrary.create({
        title: video.title,
        language: userProfile?.language || "hebrew",
        video_url: video.video_url,
        video_id: videoId,
        topics: [],
        difficulty_level: "All",
        tags: video.tags || "",
        is_active: true,
        thumbnail_url: getThumbnailUrl(video),
        notes: ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      toast.success("Added to library!");
    },
  });

  const assignVideoMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProgram.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPrograms'] });
      queryClient.invalidateQueries({ queryKey: ['myProgram'] });
      toast.success("Video assigned!");
    },
  });

  const extractYouTubeId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchYouTubeMetadata = async (url) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    setFormData(prev => ({ ...prev, video_id: videoId }));

    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      const data = await response.json();

      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Get video duration and detect language/topics using LLM
      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this YouTube video with URL: ${url}

    1. Detect the PRIMARY language of the video (return one of: hebrew, english, spanish, french, portuguese, italian)
    2. Suggest 2-4 relevant topics from this list: Religion / Spirituality, Sports / Fitness, Cooking / Food, Nutrition, Health / Wellness, Meditation / Mindfulness, Music, Travel, Culture, Education / Learning, Business / Career, Personal Growth, Relationships, News / Current Events
    3. CRITICAL: Find the exact video duration/length and return it in MINUTES as a decimal number (e.g., 2.5 for 2 minutes 30 seconds, NOT seconds)

    Return JSON only.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            language: { type: "string" },
            topics: { type: "array", items: { type: "string" } },
            duration_minutes: { type: "number" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        thumbnail_url: thumbnailUrl,
        language: analysisResult.language || prev.language,
        topics: analysisResult.topics || [],
        duration_minutes: analysisResult.duration_minutes || ""
      }));

      toast.success("Video info loaded!");
    } catch (e) {
      toast.error("Could not fetch video details");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      language: "hebrew",
      video_url: "",
      video_id: "",
      topics: [],
      difficulty_level: "All",
      duration_minutes: "",
      tags: "",
      accent_region: "",
      is_active: true,
      thumbnail_url: "",
      notes: "",
      default_day: "",
      transcript_phonetics: ""
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.video_url || !formData.video_id) {
      toast.error("Title, URL, and Video ID are required");
      return;
    }

    let processedTranscript = undefined;
    
    // Process transcript only if new phonetics provided
    if (formData.transcript_phonetics && formData.transcript_phonetics.trim()) {
      toast.info("Processing transcript...");
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are processing a Hebrew phonetic transcript for a language learning app.

Input (Hebrew phonetics): "${formData.transcript_phonetics}"

For each line/sentence:
1. Convert phonetics to proper Hebrew script with nikud (vowel points)
2. Provide clean Latin transliteration (no Hebrew characters)
3. Translate to English

Return a JSON array where each item has:
- text: original phonetic input
- hebrew: Hebrew text with nikud
- transliteration: Latin alphabet only
- english: English translation
- start: timestamp in seconds (estimate based on position, starting at 0)

Keep natural sentence breaks. Estimate reasonable timestamps (e.g., 5-10 seconds per sentence).`,
          response_json_schema: {
            type: "object",
            properties: {
              transcript: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    hebrew: { type: "string" },
                    transliteration: { type: "string" },
                    english: { type: "string" },
                    start: { type: "number" }
                  }
                }
              }
            }
          }
        });
        processedTranscript = result.transcript;
        toast.success("Transcript processed!");
      } catch (e) {
        toast.error("Failed to process transcript");
      }
    }

    const data = {
      ...formData,
      duration_minutes: formData.duration_minutes ? parseFloat(formData.duration_minutes) : null,
      default_day: formData.default_day ? parseInt(formData.default_day) : null,
    };

    // Only include processed_transcript if it was updated
    if (processedTranscript !== undefined) {
      data.processed_transcript = processedTranscript;
    }

    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data });
    } else {
      createVideoMutation.mutate(data);
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setMediaType(video.video_url?.endsWith('.mp3') || video.video_url?.includes('audio') ? "audio" : "video");
    setFormData({
      title: video.title,
      language: video.language,
      video_url: video.video_url,
      video_id: video.video_id,
      topics: video.topics || [],
      difficulty_level: video.difficulty_level || "All",
      duration_minutes: video.duration_minutes || "",
      tags: video.tags || "",
      accent_region: video.accent_region || "",
      is_active: video.is_active !== false,
      thumbnail_url: video.thumbnail_url || "",
      notes: video.notes || "",
      default_day: video.default_day || "",
      transcript_phonetics: video.transcript_phonetics || ""
    });
    setShowAddDialog(true);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error("Please upload an MP3 audio file");
      return;
    }

    setUploadingAudio(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        video_url: result.file_url,
        video_id: `audio_${Date.now()}`,
        thumbnail_url: ""
      }));
      toast.success("Audio uploaded!");
    } catch (e) {
      toast.error("Failed to upload audio");
    } finally {
      setUploadingAudio(false);
    }
  };



  const toggleTopic = (topic) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.tags || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = filterLanguage === "all" || video.language === filterLanguage;
    const matchesDifficulty = filterDifficulty === "all" || video.difficulty_level === filterDifficulty;
    const matchesTopic = filterTopic === "all" || (video.topics || []).includes(filterTopic);
    return matchesSearch && matchesLanguage && matchesDifficulty && matchesTopic && video.is_active !== false;
  }).sort((a, b) => {
    // Extract day numbers from titles (e.g., "day 1", "Day 2", etc.)
    const dayRegex = /day\s*(\d+)/i;
    const aDayMatch = a.title.match(dayRegex);
    const bDayMatch = b.title.match(dayRegex);
    
    if (aDayMatch && bDayMatch) {
      return parseInt(aDayMatch[1]) - parseInt(bDayMatch[1]);
    }
    if (aDayMatch) return -1;
    if (bDayMatch) return 1;
    
    return a.title.localeCompare(b.title);
  });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'coach';
  const canDelete = currentUser?.role === 'admin';
  const canAssign = currentUser?.role === 'admin' || currentUser?.role === 'coach';

  const myVideos = myProgram.map(prog => {
    const video = videos.find(v => v.id === prog.media_library_id);
    return video ? { ...video, programId: prog.id, completed: prog.completed } : null;
  }).filter(Boolean);

  const processManualTranscript = async (video, text) => {
    if (!text || !text.trim()) {
      toast.error("Please paste a transcript");
      return;
    }

    setLoadingTranscript(true);
    toast.info("Processing transcript...");

    try {
      // Split into sentences/segments
      const sentences = text
        .split(/[.!?]\s+/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());

      // Estimate timestamps (assume ~3 seconds per sentence)
      const rawSegments = sentences.map((text, idx) => ({
        text,
        start: idx * 3,
        duration: 3
      }));

      // Process with AI
      const processedSegments = [];
      const batchSize = 5;

      for (let i = 0; i < rawSegments.length; i += batchSize) {
        const batch = rawSegments.slice(i, i + batchSize);

        try {
          const llmResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Process these Hebrew sentences. Return exactly ${batch.length} segments.

  ${batch.map((s, idx) => `[${idx + 1}] "${s.text}"`).join('\n')}

  For each provide:
  - hebrew: Hebrew with nikud
  - transliteration: Latin phonetic
  - english: English translation`,
            response_json_schema: {
              type: "object",
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      hebrew: { type: "string" },
                      transliteration: { type: "string" },
                      english: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          batch.forEach((segment, idx) => {
            const processed = llmResult.segments?.[idx] || {};
            processedSegments.push({
              text: segment.text,
              hebrew: processed.hebrew || segment.text,
              transliteration: processed.transliteration || segment.text,
              english: processed.english || '',
              start: segment.start
            });
          });

          toast.info(`${Math.min(i + batchSize, rawSegments.length)} / ${rawSegments.length} done`);
        } catch (e) {
          console.error('Batch error:', e);
          batch.forEach(segment => processedSegments.push(segment));
        }
      }

      // Save
      await updateVideoMutation.mutateAsync({
        id: video.id,
        data: { processed_transcript: processedSegments }
      });

      setTranscript(processedSegments);
      setPastedTranscript("");
      toast.success("Transcript processed!");
    } catch (e) {
      console.error('Error:', e);
      toast.error(e.message || "Failed to process");
    } finally {
      setLoadingTranscript(false);
    }
  };

  const generateTranscriptFromYouTube = async (video) => {
    try {
      const videoId = video.video_id || video.youtube_video_id || extractYouTubeId(video.video_url);
      console.log('Starting transcript generation for video ID:', videoId);

      if (!videoId) {
        toast.error("Could not extract video ID");
        return;
      }

      setLoadingTranscript(true);

      // Show initial status
      const statusToast = toast.loading("Step 1/5: Fetching YouTube data...", { duration: Infinity });

      try {
        // Fetch YouTube captions with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 60 seconds')), 60000)
        );

        const resultPromise = base44.functions.invoke('youtubeTranscript', { videoId });
        const result = await Promise.race([resultPromise, timeoutPromise]);

        console.log('Function response:', result);

        if (!result || !result.data) {
          toast.dismiss(statusToast);
          toast.error("No response from transcription service");
          setLoadingTranscript(false);
          return;
        }

        // Show step progress
        if (result.data.steps) {
          const stepLabels = {
            'page_fetched': 'Step 2/5: Extracting audio stream...',
            'audio_extracted': 'Step 3/5: Downloading audio...',
            'audio_downloaded': 'Step 4/5: Transcribing with AI...',
            'whisper_transcribed': 'Step 5/5: Processing transcript...',
            'complete': 'Complete!'
          };
          toast.dismiss(statusToast);
          toast.success(`Complete in ${result.data.processingTime}s!`);
        }

        if (!result.data.transcript || result.data.transcript.length === 0) {
          toast.dismiss(statusToast);
          const errorMsg = result.data.error || "No transcript available";
          toast.error(errorMsg, { 
            duration: 6000,
            description: result.data.details ? "Check browser console for details" : undefined
          });
          if (result.data.details) {
            console.error("Transcript error details:", result.data.details);
          }
          setLoadingTranscript(false);
          return;
        }

        toast.dismiss(statusToast);
        const rawTranscript = result.data.transcript;
        toast.info(`Processing ${rawTranscript.length} segments...`);

      // Process in batches
      const processedSegments = [];
      const batchSize = 5;

      for (let i = 0; i < rawTranscript.length; i += batchSize) {
        const batch = rawTranscript.slice(i, i + batchSize);

        try {
          const llmResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Process these Hebrew captions. Return exactly ${batch.length} segments.

  ${batch.map((s, idx) => `[${idx + 1}] "${s.text}"`).join('\n')}

  For each segment provide:
  - hebrew: Hebrew with nikud
  - transliteration: Latin phonetic
  - english: English translation`,
            response_json_schema: {
              type: "object",
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      hebrew: { type: "string" },
                      transliteration: { type: "string" },
                      english: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          batch.forEach((segment, idx) => {
            const processed = llmResult.segments?.[idx] || {};
            processedSegments.push({
              text: segment.text,
              hebrew: processed.hebrew || segment.text,
              transliteration: processed.transliteration || segment.text,
              english: processed.english || '',
              start: segment.start
            });
          });

          toast.info(`${Math.min(i + batchSize, rawTranscript.length)} / ${rawTranscript.length} done`);
        } catch (e) {
          console.error('Batch error:', e);
          batch.forEach(segment => processedSegments.push(segment));
        }
      }

      // Save
      await updateVideoMutation.mutateAsync({
        id: video.id,
        data: { processed_transcript: processedSegments }
      });

      setTranscript(processedSegments);
      toast.success("Transcript generated!");
      } catch (timeoutError) {
        toast.dismiss(statusToast);
        console.error('Timeout or fetch error:', timeoutError);
        toast.error("Request timeout - this video may be too long or restricted", {
          duration: 8000,
          description: "Try pasting the transcript manually or use a shorter video"
        });
        setLoadingTranscript(false);
      }
      } catch (e) {
      console.error('Full error:', e);
      toast.error(e.message || "Failed to generate transcript", {
        duration: 6000,
        description: "Check console for details or try manual paste"
      });
      console.error("Error details:", e);
      } finally {
      setLoadingTranscript(false);
      }
      };

  const handleVideoClick = async (video) => {
    setSelectedVideo(video);
    setShowTranscript(true);
    setTranscript([]);
    setLoadingTranscript(true);
    setVideoPlayer(null);

    // Initialize YouTube player
    const videoId = video.video_id || video.youtube_video_id || extractYouTubeId(video.video_url);

    if (!videoId) {
      toast.error("Could not extract video ID");
      setLoadingTranscript(false);
      return;
    }

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    // Initialize player when API is ready
    const initPlayer = () => {
      // Clear any existing player
      const container = document.getElementById('youtube-player');
      if (container) {
        container.innerHTML = '';
      }

      const player = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: { 
          enablejsapi: 1,
          autoplay: 0,
          controls: 1
        },
        events: {
          onReady: (event) => {
            setVideoPlayer(event.target);
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      // Small delay to ensure DOM is ready
      setTimeout(initPlayer, 100);
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Check if video has processed transcript first
    if (video.processed_transcript && video.processed_transcript.length > 0) {
      setTranscript(video.processed_transcript);
      setLoadingTranscript(false);
      return;
    }

    // Otherwise try to fetch raw transcript from YouTube
    try {
      const result = await base44.functions.invoke('youtubeTranscript', { videoId });
      
      if (result.data?.transcript) {
        // Show raw transcript (user can generate full version with button)
        setTranscript(result.data.transcript);
      } else {
        toast.error("No transcript available");
      }
    } catch (e) {
      // Silently fail - user can click generate button
    }
    setLoadingTranscript(false);
  };

  const handleAddWordFromTranscript = async (word) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this ${userProfile?.language || 'Hebrew'} word to English: "${word}". Return only the English translation, nothing else.`
      });
      
      createWordMutation.mutate({
        word: word,
        translation: result,
        category: "wordbank",
        times_practiced: 0,
        mastered: false,
        vocab_level: 0,
      });
    } catch (e) {
      toast.error("Translation failed");
    }
  };

  const handleSeekTo = async (seconds, shouldPlay = false) => {
    if (videoPlayer && videoPlayer.seekTo) {
      videoPlayer.seekTo(seconds, true);
      if (shouldPlay) {
        videoPlayer.playVideo();
      } else {
        videoPlayer.pauseVideo();
      }
    }
  };

  // Track current playback time
  useEffect(() => {
    if (!videoPlayer || !showTranscript) return;

    const interval = setInterval(async () => {
      try {
        const time = await videoPlayer.getCurrentTime?.();
        if (typeof time === 'number') {
          setCurrentTime(time);
        }
      } catch (e) {
        // Player not ready
      }
    }, 100); // Update every 100ms for smooth highlighting

    return () => clearInterval(interval);
  }, [videoPlayer, showTranscript]);

  // Space bar to play/pause video
  useEffect(() => {
    const handleKeyPress = async (e) => {
      if (e.code === 'Space' && videoPlayer && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const playerState = await videoPlayer.getPlayerState?.();
        if (playerState === 1) {
          videoPlayer.pauseVideo();
        } else {
          videoPlayer.playVideo();
        }
      }
    };

    if (showTranscript) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [videoPlayer, showTranscript]);

  const getThumbnailUrl = (video) => {
    // Try thumbnail_url first
    if (video.thumbnail_url && video.thumbnail_url.trim()) {
      return video.thumbnail_url;
    }
    
    let videoId = null;
    
    // Try stored video_id first
    if (video.video_id && video.video_id.trim()) {
      videoId = video.video_id;
    }
    // Try extracting from video_url
    else if (video.video_url && video.video_url.trim()) {
      videoId = extractYouTubeId(video.video_url);
    }
    // For Video entity with youtube_video_id
    else if (video.youtube_video_id && video.youtube_video_id.trim()) {
      videoId = video.youtube_video_id;
    }
    
    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    return null;
  };

  return (
    <>
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 50%, #eae6da 100%)' }}>
      <MediaLibraryHeader />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Media Library</h1>
        </div>

        {/* Filter Buttons and Actions */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#ffffff18', border: '1px solid #ffffff20', width: 'fit-content' }}>
            <button onClick={() => setFilterLanguage('all')} className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${filterLanguage === 'all' && filterDifficulty === 'all' && filterTopic === 'all' ? 'bg-white/20' : 'text-white/60 hover:text-white/80'}`} style={{ color: filterLanguage === 'all' && filterDifficulty === 'all' && filterTopic === 'all' ? '#3d4a2e' : undefined }}>All</button>
            <button onClick={() => { setFilterLanguage('hebrew'); setFilterDifficulty('all'); setFilterTopic('all'); }} className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${filterLanguage === 'hebrew' && filterDifficulty === 'all' && filterTopic === 'all' ? 'bg-white/20' : 'text-white/60 hover:text-white/80'}`} style={{ color: filterLanguage === 'hebrew' && filterDifficulty === 'all' && filterTopic === 'all' ? '#3d4a2e' : undefined }}>📹 Videos</button>
            <button onClick={() => { setFilterLanguage('all'); setFilterDifficulty('all'); setFilterTopic('all'); }} className={`px-3 py-1.5 rounded text-sm font-semibold transition-all text-white/60 hover:text-white/80`}>🎧 Audio Training</button>
          </div>
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#ffffff18', border: '1px solid #ffffff20' }}>
            <button className="px-3 py-1.5 rounded text-sm font-semibold" style={{ color: '#6b7c5a' }}>🎵 Songs</button>
            {canEdit && (
              <Button
                onClick={() => { resetForm(); setEditingVideo(null); setMediaType("video"); setShowAddDialog(true); }}
                className="px-3 py-1.5 text-sm"
                style={{ background: 'transparent', border: 'none', color: '#6b7c5a' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Media
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-white/80 mb-2">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search videos..."
                  className="pl-10 bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/80 mb-2">Language</Label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="hebrew">Hebrew</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="portuguese">Portuguese</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80 mb-2">Difficulty</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/80 mb-2">Topic</Label>
              <Select value={filterTopic} onValueChange={setFilterTopic}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* User's Custom Videos (from Video entity / BabyVideos) */}
        {userVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">My Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userVideos.map((video) => {
                const ytId = video.youtube_video_id || (video.video_url ? video.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^&?]+)/)?.[1] : null);
                const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleVideoClick({ ...video, video_id: ytId })}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-blue-500/30 overflow-hidden hover:border-blue-400/60 transition-all cursor-pointer"
                  >
                    <div className="w-full aspect-video bg-black">
                      {thumb ? (
                        <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                          <Video className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-bold text-base flex-1">{video.title}</h3>
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex-shrink-0">My Video</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assigned Videos Section */}
        {myVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">My Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myVideos.map((video) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleVideoClick(video)}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <div className="w-full aspect-video bg-black">
                    {getThumbnailUrl(video) ? (
                      <img 
                        src={getThumbnailUrl(video)} 
                        alt={video.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <Video className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                   <div className="flex items-start justify-between gap-2 mb-2">
                     <h3 className="text-white font-bold text-base flex-1">{video.title}</h3>
                     <div className="flex gap-1 flex-shrink-0">
                       {canEdit && (
                         <button
                           onClick={(e) => { e.stopPropagation(); handleEdit(video); }}
                           className="text-white/60 hover:text-white transition-colors p-1"
                         >
                           <Pencil className="w-4 h-4" />
                         </button>
                       )}
                       {canDelete && (
                         <button
                           onClick={(e) => { e.stopPropagation(); if (confirm("Delete this video from your list?")) { deleteVideoMutation.mutate(video.id); } }}
                           className="text-white/60 hover:text-white transition-colors p-1"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   </div>
                   {video.completed && (
                     <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">✓ Completed</span>
                   )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Library Videos Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="w-full bg-cyan-600/40 hover:bg-cyan-600/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center justify-between transition-all mb-4"
          >
            <h2 className="text-xl font-bold text-white">
              Library Videos ({filteredVideos.length})
            </h2>
            <ChevronDown className={`w-6 h-6 text-white transition-transform ${showLibrary ? 'rotate-180' : ''}`} />
          </button>
          {showLibrary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => handleVideoClick(video)}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-white/30 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="w-full aspect-video bg-black">
                  <img 
                    src={getThumbnailUrl(video) || `https://i.ytimg.com/vi/${extractYouTubeId(video.video_url) || 'default'}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-gradient-to-br', 'from-purple-500/20', 'to-pink-500/20');
                      e.target.parentElement.classList.remove('bg-black');
                      const icon = document.createElement('div');
                      icon.innerHTML = '<svg class="w-12 h-12 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
                      icon.className = 'flex items-center justify-center h-full';
                      e.target.parentElement.appendChild(icon);
                    }}
                  />
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-bold text-base flex-1">{video.title}</h3>
                    <div className="flex gap-1 flex-shrink-0">
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(video); }}
                          className="text-white/60 hover:text-white transition-colors p-1"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm("Delete this video from library?")) { deleteVideoMutation.mutate(video.id); } }}
                          className="text-white/60 hover:text-white transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-2 overflow-x-auto whitespace-nowrap items-center">
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded flex-shrink-0">
                      {video.language}
                    </span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded flex-shrink-0">
                      {video.difficulty_level}
                    </span>
                    {video.duration_minutes && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded flex-shrink-0">
                        {video.duration_minutes} min
                      </span>
                    )}
                    {video.topics && video.topics.length > 0 && (
                      <>
                        {video.topics.slice(0, 2).map((topic, idx) => (
                          <span key={idx} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded flex-shrink-0">
                            {topic}
                          </span>
                        ))}
                        {video.topics.length > 2 && (
                          <span className="text-xs text-white/40 flex-shrink-0">+{video.topics.length - 2}</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    {canAssign && (
                      <Select onValueChange={(userEmail) => {
                        if (userEmail) {
                          assignVideoMutation.mutate({
                            user_email: userEmail,
                            media_library_id: video.id,
                            assigned_by: currentUser.email,
                            assigned_at: new Date().toISOString(),
                            order: 0
                          });
                        }
                      }}>
                        <SelectTrigger className="w-full bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30">
                          <Users className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Assign to user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.map(user => (
                            <SelectItem key={user.id} value={user.email}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                  </div>
                </div>
              </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Recommended Videos Section */}
        {allVideosData.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowRecommended(!showRecommended)}
              className="w-full bg-purple-600/40 hover:bg-purple-600/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center justify-between transition-all mb-4"
            >
              <h2 className="text-xl font-bold text-white">
                Recommended Videos ({allVideosData.filter(video => {
                  if (userProfile?.language === 'hebrew') {
                    return video.title?.toLowerCase().includes('hebrew') || 
                           video.tags?.toLowerCase().includes('hebrew') ||
                           video.title?.toLowerCase().includes('עברית');
                  }
                  return true;
                }).filter((video, index, self) => 
                  index === self.findIndex(v => 
                    (v.video_url === video.video_url) || 
                    (v.youtube_video_id && v.youtube_video_id === video.youtube_video_id)
                  )
                ).length})
              </h2>
              <ChevronDown className={`w-6 h-6 text-white transition-transform ${showRecommended ? 'rotate-180' : ''}`} />
            </button>
            {showRecommended && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {allVideosData
                .filter(video => {
                  // Only show Hebrew videos for Hebrew learners
                  if (userProfile?.language === 'hebrew') {
                    return video.title?.toLowerCase().includes('hebrew') || 
                           video.tags?.toLowerCase().includes('hebrew') ||
                           video.title?.toLowerCase().includes('עברית');
                  }
                  return true;
                })
                .filter((video, index, self) => 
                  // Remove duplicates by video_url or youtube_video_id
                  index === self.findIndex(v => 
                    (v.video_url === video.video_url) || 
                    (v.youtube_video_id && v.youtube_video_id === video.youtube_video_id)
                  )
                )
                .slice(0, 15)
                .map((video) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleVideoClick(video)}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer flex"
                >
                  {getThumbnailUrl(video) ? (
                    <img 
                      src={getThumbnailUrl(video)} 
                      alt={video.title}
                      className="w-48 h-32 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-48 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Video className="w-12 h-12 text-white/40" />
                    </div>
                  )}
                  <div className="p-4 flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{video.title}</h3>
                    {video.tags && (
                      <p className="text-white/60 text-sm mb-3">{video.tags}</p>
                    )}
                    {canEdit && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToLibraryMutation.mutate(video);
                        }}
                        size="sm"
                        className="bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add to Library
                      </Button>
                    )}
                  </div>
                </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Media" : "Add Media to Library"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingVideo && (
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={mediaType === "video" ? "bg-cyan-500" : "bg-white/10"}
                >
                  📹 Video
                </Button>
                <Button
                  type="button"
                  onClick={() => setMediaType("audio")}
                  className={mediaType === "audio" ? "bg-cyan-500" : "bg-white/10"}
                >
                  🎵 Audio
                </Button>
                <Button
                  type="button"
                  onClick={() => setMediaType("song")}
                  className={mediaType === "song" ? "bg-cyan-500" : "bg-white/10"}
                >
                  🎶 Song
                </Button>
              </div>
            )}

            {mediaType === "video" ? (
              <div>
                <Label>Video URL *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-white/5 border-white/20 text-white flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => fetchYouTubeMetadata(formData.video_url)}
                    disabled={!formData.video_url}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    Load
                  </Button>
                </div>
              </div>
            ) : mediaType === "audio" ? (
              <div>
                <Label>Upload MP3 Audio *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="audio/mp3,audio/mpeg,.mp3"
                    onChange={handleAudioUpload}
                    className="bg-white/5 border-white/20 text-white flex-1"
                    disabled={uploadingAudio}
                  />
                  {uploadingAudio && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                </div>
                {formData.video_url && (
                  <p className="text-xs text-green-400 mt-1">✓ Audio uploaded</p>
                )}
              </div>
            ) : (
              <div>
                <Label>Upload Song (MP3) *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                    onChange={handleAudioUpload}
                    className="bg-white/5 border-white/20 text-white flex-1"
                    disabled={uploadingAudio}
                  />
                  {uploadingAudio && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                </div>
                {formData.video_url && (
                  <p className="text-xs text-green-400 mt-1">✓ Song uploaded</p>
                )}
                <p className="text-xs text-white/50 mt-2">Supported: MP3, WAV, OGG</p>
              </div>
            )}

            <div>
              <Label>Video ID * (auto-populated)</Label>
              <Input
                value={formData.video_id}
                readOnly
                placeholder="Auto-populated from URL"
                className="bg-white/5 border-white/20 text-white/60"
              />
            </div>

            <div>
              <Label>Title * (editable)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Auto-populated from YouTube"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Language *</Label>
                <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hebrew">Hebrew</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="portuguese">Portuguese</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Difficulty</Label>
                <Select value={formData.difficulty_level} onValueChange={(val) => setFormData({ ...formData, difficulty_level: val })}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Topics (select multiple)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {topics.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`text-sm px-3 py-2 rounded border transition-all ${
                      formData.topics.includes(topic)
                        ? 'bg-cyan-500/30 border-cyan-500 text-cyan-400'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duration (minutes) - auto-populated</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label>Default Day (1-100)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.default_day}
                  onChange={(e) => setFormData({ ...formData, default_day: e.target.value })}
                  placeholder="Optional"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label>Accent/Region</Label>
                <Input
                  value={formData.accent_region}
                  onChange={(e) => setFormData({ ...formData, accent_region: e.target.value })}
                  placeholder="Optional"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="keywords, phrases, topics"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                Active
              </label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>

            <div>
              <Label>Transcript (Hebrew Phonetics)</Label>
              <p className="text-xs text-white/60 mb-2">Paste Hebrew phonetic transcript. System will add transliteration, translation, and Hebrew phonetics.</p>
              <Textarea
                value={formData.transcript_phonetics}
                onChange={(e) => setFormData({ ...formData, transcript_phonetics: e.target.value })}
                placeholder="Paste Hebrew phonetics here..."
                className="bg-white/5 border-white/20 text-white"
                rows={6}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                {(createVideoMutation.isPending || updateVideoMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingVideo ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingVideo ? "Update Video" : "Add to Library"
                )}
              </Button>
              <Button onClick={() => { setShowAddDialog(false); setEditingVideo(null); resetForm(); }} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Video Transcript Dialog - Fullscreen */}
      {showTranscript && (
        <div className="fixed inset-0 z-50 bg-slate-900">
          <MediaLibraryHeader />
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-white font-bold text-xl">{selectedVideo?.title}</h2>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-white/60 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Player */}
            <div className="w-full bg-black flex items-center justify-center" style={{ height: '30vh' }}>
              {(selectedVideo?.video_id || selectedVideo?.youtube_video_id || selectedVideo?.video_url) && (
                <div id="youtube-player" className="w-full h-full" />
              )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTranscript ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : transcript.length > 0 ? (
                <ContinuousTranscript
                  transcript={transcript}
                  currentTime={currentTime}
                  onSeekTo={handleSeekTo}
                  onAddWord={handleAddWordFromTranscript}
                  onEditWord={saveTranscriptEdit}
                  canEdit={canEdit}
                />
              ) : (
                <div className="max-w-3xl mx-auto bg-white/5 rounded-xl p-8 space-y-6">
                  <div className="text-center">
                    <p className="text-white/60 mb-4">No transcript available</p>
                    <p className="text-white/40 text-sm mb-6">Paste transcript from YouTube "Show transcript" or DownSub</p>
                  </div>

                  <Textarea
                    value={pastedTranscript}
                    onChange={(e) => setPastedTranscript(e.target.value)}
                    placeholder="Paste transcript here..."
                    className="bg-white/5 border-white/20 text-white min-h-[200px]"
                  />

                  <div className="flex gap-3">
                    <Button
                      onClick={() => processManualTranscript(selectedVideo, pastedTranscript)}
                      disabled={!pastedTranscript.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      Process Transcript
                    </Button>
                    {canEdit && (
                      <Button
                        onClick={() => generateTranscriptFromYouTube(selectedVideo)}
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400"
                      >
                        Try YouTube Auto
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    <TranslatorWidget />
    </>
    );
    }