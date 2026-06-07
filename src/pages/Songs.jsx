import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Music, Plus, Check, ChevronRight, Upload, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import GameHeader from "../components/game/GameHeader";
import VideoTranscript from "../components/video/VideoTranscript";
import KaraokeTranscript from "../components/transcript/KaraokeTranscript";
import EditableWord from "../components/learning/EditableWord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Songs() {
  const queryClient = useQueryClient();
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [addingSong, setAddingSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isAdmin;
  const canDeleteSong = (song) => isAdmin || song.created_by === currentUser?.email;

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', currentUser?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      return profiles[0] || null;
    },
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins', currentUser?.email],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.filter({ created_by: currentUser.email });
      return coins[0] || { coins: 0 };
    },
    enabled: !!currentUser?.email,
    staleTime: 2 * 60 * 1000,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const allSongs = await base44.entities.Song.list();
      return allSongs.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  });

  const { data: songProgress = [] } = useQuery({
    queryKey: ['songProgress'],
    queryFn: () => base44.entities.SongProgress.list(),
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings', currentUser?.email],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank", created_by: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const createSongProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.SongProgress.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songProgress'] }),
  });

  const updateSongProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SongProgress.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songProgress'] }),
  });

  const createSongMutation = useMutation({
    mutationFn: (song) => base44.entities.Song.create(song),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setAddingSong(false);
      setNewSongUrl("");
      toast.success("Song added! 🎵");
    },
    onError: (e) => { console.error("Song.create failed", e); toast.error("Couldn't save song — you don't have permission."); },
  });

  const updateSongMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Song.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Updated!");
    },
    onError: (e) => { console.error("Song.update failed", e); toast.error("Couldn't save changes — you don't have permission."); },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id) => base44.entities.Song.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Song deleted");
    },
    onError: (e) => { console.error("Song.delete failed", e); toast.error("Couldn't delete song — you don't have permission."); },
  });

  const reorderSongsMutation = useMutation({
    mutationFn: async (songs) => {
      await Promise.all(
        songs.map((song, index) => 
          base44.entities.Song.update(song.id, { order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Order saved!");
    },
  });

  const addWordToBackpack = async (word, songId, songTitle) => {
    const existingWord = wordRatings.find(w => w.word === word.hebrew);
    if (existingWord) {
      toast.info("Already in backpack!");
      return;
    }

    await createWordMutation.mutateAsync({
      word: word.hebrew,
      translation: word.english,
      phonetic: word.transliteration,
      category: 'wordbank',
      example_sentence: `From song: ${songTitle}`,
      times_practiced: 1,
      mastered: false,
    });

    toast.success(`Added "${word.transliteration}" to backpack! 🎒`);

    // Update song progress
    const progress = songProgress.find(p => p.song_id === songId);
    const song = songs.find(s => s.id === songId);
    
    if (song) {
      const allWordsAdded = song.transcript.every(w => 
        wordRatings.find(wr => wr.word === w.hebrew) || w.hebrew === word.hebrew
      );

      if (progress) {
        const newWordsAdded = [...(progress.words_added || []), word.hebrew];
        await updateSongProgressMutation.mutateAsync({
          id: progress.id,
          data: { 
            words_added: newWordsAdded,
            completed: allWordsAdded
          }
        });
        if (allWordsAdded) {
          toast.success("🎉 Song completed! All words added!");
        }
      } else {
        await createSongProgressMutation.mutateAsync({
          song_id: songId,
          words_added: [word.hebrew],
          completed: allWordsAdded
        });
      }
    }
  };

  const getSongProgress = (songId) => {
    return songProgress.find(p => p.song_id === songId);
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
    return match ? match[1] : null;
  };

  const handleAddSong = () => {
    const ytId = extractYouTubeId(newSongUrl);
    if (!ytId && !newSongUrl.includes('http')) {
      toast.error("Invalid YouTube URL");
      return;
    }
    
    createSongMutation.mutate({
      title: `Song ${songs.length + 1}`,
      youtube_url: newSongUrl,
      youtube_id: ytId,
      transcript: [],
      level: 1,
      order: songs.length
    });
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error("Please upload an audio file (MP3, WAV, etc.)");
      return;
    }

    setUploadingAudio(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      createSongMutation.mutate({
        title: `Song ${songs.length + 1}`,
        audio_url: file_url,
        transcript: [],
        level: 1,
        order: songs.length
      });
    } catch (error) {
      toast.error("Failed to upload audio");
    }
    setUploadingAudio(false);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(songs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    reorderSongsMutation.mutate(reordered);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0ece4 0%, #e8e4d8 50%, #eae6da 100%)' }}>
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="text-stone-400 hover:text-stone-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#3a4a3a', fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}>🎵 Learn Hebrew Songs</h1>
              <p style={{ color: '#7a8a72', fontFamily: 'Jost, sans-serif' }}>Watch, listen, and add vocab to your backpack</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => setAddingSong(!addingSong)} className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" /> Add Song
            </Button>
          )}
        </div>

        {addingSong && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-stone-200 p-6 mb-6">
            <h3 className="font-bold mb-4" style={{ color: '#3a4a3a', fontFamily: 'Jost, sans-serif' }}>Add New Song</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-stone-500 text-sm mb-2 block">YouTube URL</label>
                <div className="flex gap-2">
                  <Input
                    value={newSongUrl}
                    onChange={(e) => setNewSongUrl(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    className="bg-white/50 border-stone-200 text-stone-800 flex-1"
                  />
                  <Button onClick={handleAddSong} disabled={!newSongUrl.trim()}>
                    Add Video
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-sm">OR</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <div>
                <label className="text-stone-500 text-sm mb-2 block">Upload Audio File (MP3, WAV)</label>
                <label className="block">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <Button 
                    as="span" 
                    variant="outline" 
                    className="border-white/20 text-white w-full cursor-pointer"
                    disabled={uploadingAudio}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingAudio ? "Uploading..." : "Choose Audio File"}
                  </Button>
                </label>
              </div>

              <Button onClick={() => setAddingSong(false)} variant="outline" className="w-full border-white/20 text-white">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {songs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-400">No songs yet! Come back soon.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="songs">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {songs.map((song, index) => {
                    const isExpanded = expandedSongId === song.id;
                    const progress = getSongProgress(song.id);
                    const isCompleted = progress?.completed || false;
                    const ytId = extractYouTubeId(song.youtube_url);
                    const hasVideo = !!song.youtube_url;
                    const hasAudio = !!song.audio_url;

                    return (
                      <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={!isAdmin}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-stone-200 overflow-hidden ${
                              snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                            }`}
                          >
                            <div className="flex gap-4 p-4">
                              {isAdmin && (
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex items-center">
                                  <GripVertical className="w-5 h-5 text-stone-400" />
                                </div>
                              )}
                              <div
                                onClick={() => setExpandedSongId(isExpanded ? null : song.id)}
                                className="flex-1 flex gap-4 cursor-pointer hover:bg-white/5 transition-all rounded-lg"
                              >
                                <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                                  {ytId ? (
                                    <img
                                      src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                      <Music className="w-12 h-12 text-white" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <Music className="w-10 h-10 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isCompleted && (
                                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    {isAdmin ? (
                                      <EditableWord
                                        text={song.title}
                                        onSave={(newTitle) => updateSongMutation.mutate({ id: song.id, data: { title: newTitle } })}
                                        className="text-white font-bold"
                                      />
                                    ) : (
                                      <h3 className="text-white font-bold">{song.title}</h3>
                                    )}
                                  </div>
                                  <p className="text-stone-500 text-sm mt-1">
                                    Level {song.level} • {hasVideo ? '📺 Video' : '🎵 Audio'} • {song.transcript?.length || 0} words
                                  </p>
                                  {isCompleted && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                      ✓ Completed
                                    </span>
                                  )}
                                </div>
                                <ChevronRight className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                              {canDeleteSong(song) && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); if (confirm("Delete this song?")) deleteSongMutation.mutate(song.id); }}
                                   className="w-8 h-8 rounded bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center flex-shrink-0"
                                 >
                                   <Trash2 className="w-4 h-4 text-red-400" />
                                 </button>
                               )}
                            </div>

                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="p-4 bg-stone-50/80 border-t border-stone-200 space-y-4"
                              >
                                {hasVideo && ytId && (
                                  <div className="aspect-video bg-black rounded-xl overflow-hidden">
                                    <iframe
                                      id={`youtube-player-${song.id}`}
                                      width="100%"
                                      height="100%"
                                      src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1`}
                                      title={song.title}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                )}

                                {hasAudio && !hasVideo && (
                                  <div className="bg-white/60 rounded-xl p-4">
                                    <audio id={`audio-player-${song.id}`} controls className="w-full">
                                      <source src={song.audio_url} type="audio/mpeg" />
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}

                                {song.transcript && song.transcript.length > 0 && song.transcript[0].start_ms !== undefined ? (
                                  <div className="mt-4">
                                    <p className="text-stone-500 text-sm mb-3">🎤 Karaoke Lyrics - Click line to jump</p>
                                    <KaraokeTranscript
                                      lines={song.transcript.map((line, idx) => ({
                                        id: `line_${idx}`,
                                        start_ms: line.start_ms || idx * 5000,
                                        end_ms: line.end_ms || (idx + 1) * 5000,
                                        transliteration: line.transliteration,
                                        english: line.english,
                                        hebrew: line.hebrew
                                      }))}
                                      audioRef={hasAudio && !hasVideo ? { current: document.getElementById(`audio-player-${song.id}`) } : null}
                                      videoRef={hasVideo ? { current: document.getElementById(`youtube-player-${song.id}`) } : null}
                                      onLineUpdate={(lineIndex, updatedLine) => {
                                        const newTranscript = [...song.transcript];
                                        newTranscript[lineIndex] = {
                                          ...song.transcript[lineIndex],
                                          transliteration: updatedLine.transliteration,
                                          english: updatedLine.english,
                                          hebrew: updatedLine.hebrew
                                        };
                                        updateSongMutation.mutate({ id: song.id, data: { transcript: newTranscript } });
                                      }}
                                      onAddToBackpack={(hebrew, transliteration, english) => {
                                        addWordToBackpack({ hebrew, transliteration, english }, song.id, song.title);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <VideoTranscript
                                    videoId={song.id}
                                    videoUrl={song.youtube_url || song.audio_url}
                                    onPauseVideo={() => {
                                      if (hasVideo) {
                                        const iframe = document.getElementById(`youtube-player-${song.id}`);
                                        if (iframe && iframe.contentWindow) {
                                          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                        }
                                      }
                                    }}
                                    onSeekVideo={(seconds) => {
                                      if (hasVideo) {
                                        const iframe = document.getElementById(`youtube-player-${song.id}`);
                                        if (iframe && iframe.contentWindow) {
                                          iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${seconds}, true]}`, '*');
                                          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                        }
                                      }
                                    }}
                                  />
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}