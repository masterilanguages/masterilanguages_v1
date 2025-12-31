import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search, Filter, Video, Users } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningVideo, setAssigningVideo] = useState(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

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
    notes: ""
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

  const { data: allVideosData = [] } = useQuery({
    queryKey: ['allVideos'],
    queryFn: () => base44.entities.Video.list(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      setEditingVideo(null);
      resetForm();
      toast.success("Video updated!");
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
      toast.success("Video deleted from library");
    },
  });

  const assignVideoMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProgram.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPrograms'] });
      setShowAssignDialog(false);
      setAssigningVideo(null);
      setSelectedUser("");
      toast.success("Video assigned to user!");
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
        prompt: `Analyze this YouTube video title: "${data.title}"
        
1. Detect the PRIMARY language (return one of: hebrew, english, spanish, french, portuguese, italian)
2. Suggest 2-4 relevant topics from this list: Religion / Spirituality, Sports / Fitness, Cooking / Food, Nutrition, Health / Wellness, Meditation / Mindfulness, Music, Travel, Culture, Education / Learning, Business / Career, Personal Growth, Relationships, News / Current Events
3. Get the video duration from the page

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
      notes: ""
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.video_url || !formData.video_id) {
      toast.error("Title, URL, and Video ID are required");
      return;
    }

    const data = {
      ...formData,
      duration_minutes: formData.duration_minutes ? parseFloat(formData.duration_minutes) : null
    };

    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data });
    } else {
      createVideoMutation.mutate(data);
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
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
      notes: video.notes || ""
    });
    setShowAddDialog(true);
  };

  const handleAssign = (video) => {
    setAssigningVideo(video);
    setShowAssignDialog(true);
  };

  const confirmAssign = () => {
    if (!selectedUser) {
      toast.error("Select a user");
      return;
    }

    assignVideoMutation.mutate({
      user_email: selectedUser,
      media_library_id: assigningVideo.id,
      assigned_by: currentUser.email,
      assigned_at: new Date().toISOString(),
      order: 0
    });
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
  });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'coach';
  const canDelete = currentUser?.role === 'admin';
  const canAssign = currentUser?.role === 'admin' || currentUser?.role === 'coach';

  const myVideos = myProgram.map(prog => {
    const video = videos.find(v => v.id === prog.media_library_id);
    return video ? { ...video, programId: prog.id, completed: prog.completed } : null;
  }).filter(Boolean);

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setShowTranscript(true);
  };

  const handleAddWordFromTranscript = (word, meaning) => {
    createWordMutation.mutate({
      word: word,
      translation: meaning,
      category: "wordbank",
      times_practiced: 0,
      mastered: false,
    });
  };

  const getThumbnailUrl = (video) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    
    // For MediaLibrary videos with video_id
    if (video.video_id) {
      return `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
    }
    
    // For Video entity with youtube_video_id
    if (video.youtube_video_id) {
      return `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`;
    }
    
    // Try to extract from video_url
    if (video.video_url) {
      const videoId = extractYouTubeId(video.video_url);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Media Library</h1>
            <p className="text-white/60">Central repository for all learning videos</p>
          </div>
          {canEdit && (
            <Button
              onClick={() => { resetForm(); setEditingVideo(null); setShowAddDialog(true); }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Video
            </Button>
          )}
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

        {/* My Videos Section */}
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
                  {getThumbnailUrl(video) ? (
                    <img 
                      src={getThumbnailUrl(video)} 
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <Video className="w-16 h-16 text-white/40" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-lg mb-2">{video.title}</h3>
                    {video.completed && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">✓ Completed</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <h2 className="text-2xl font-bold text-white mb-4">Library Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-white/30 transition-all"
              >
                {/* Thumbnail */}
                {getThumbnailUrl(video) ? (
                  <img 
                    src={getThumbnailUrl(video)} 
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Video className="w-16 h-16 text-white/40" />
                  </div>
                )}

                <div className="p-4">
                  <h3 className="text-white font-bold text-lg mb-2">{video.title}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                      {video.language}
                    </span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                      {video.difficulty_level}
                    </span>
                    {video.duration_minutes && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        {video.duration_minutes} min
                      </span>
                    )}
                  </div>

                  {video.topics && video.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {video.topics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded">
                          {topic}
                        </span>
                      ))}
                      {video.topics.length > 3 && (
                        <span className="text-xs text-white/40">+{video.topics.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {canAssign && (
                      <Button
                        onClick={() => handleAssign(video)}
                        size="sm"
                        className="flex-1 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        onClick={() => handleEdit(video)}
                        size="sm"
                        variant="outline"
                        className="bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        onClick={() => {
                          if (confirm("Delete this video from library?")) {
                            deleteVideoMutation.mutate(video.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No videos found</p>
          </div>
        )}

        {/* Recommended Videos Section */}
        {allVideosData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Recommended Videos</h2>
            <div className="space-y-4">
              {allVideosData.slice(0, 10).map((video) => (
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
                      <p className="text-white/60 text-sm">{video.tags}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Video" : "Add Video to Library"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
                {editingVideo ? "Update Video" : "Add to Library"}
              </Button>
              <Button onClick={() => { setShowAddDialog(false); setEditingVideo(null); resetForm(); }} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Assign Video to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Video: {assigningVideo?.title}</Label>
            </div>
            <div>
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Choose user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmAssign} className="flex-1 bg-green-500 hover:bg-green-600">
                Assign
              </Button>
              <Button onClick={() => { setShowAssignDialog(false); setAssigningVideo(null); setSelectedUser(""); }} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Transcript Dialog */}
      <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {selectedVideo?.youtube_video_id && (
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.youtube_video_id}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            
            {selectedVideo?.transcript_text ? (
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Transcript - Click words to add to backpack</h3>
                <div className="space-y-2">
                  {selectedVideo.transcript_text.split(/[\s\n]+/).map((word, idx) => (
                    <button
                      key={idx}
                      onClick={async () => {
                        const result = await base44.integrations.Core.InvokeLLM({
                          prompt: `Translate this ${userProfile?.language || 'Hebrew'} word to English: "${word}". Return only the English translation, nothing else.`
                        });
                        handleAddWordFromTranscript(word, result);
                      }}
                      className="inline-block mr-2 mb-2 px-2 py-1 bg-white/10 hover:bg-cyan-500/30 text-white rounded transition-all hover:scale-105"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-white/60">No transcript available for this video</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}