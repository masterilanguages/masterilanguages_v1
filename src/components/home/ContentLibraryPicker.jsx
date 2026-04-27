import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function ContentLibraryPicker({ open, onOpenChange, onSelect, language }) {
  const [search, setSearch] = useState("");

  const { data: media = [] } = useQuery({
    queryKey: ["mediaLibrary"],
    queryFn: () => base44.entities.MediaLibrary.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = media
    .filter(m => m.is_active !== false)
    .filter(m => !language || m.language === language)
    .filter(m => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return m.title?.toLowerCase().includes(q) || (m.tags || "").toLowerCase().includes(q);
    });

  const getThumbnail = (m) => {
    if (m.thumbnail_url) return m.thumbnail_url;
    const id = m.video_id || extractYouTubeId(m.video_url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return null;
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const isAudio = (m) => !m.video_id && !extractYouTubeId(m.video_url) && m.video_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" style={{ background: '#f5f1eb', border: '1px solid #e0dcd4' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, serif' }}>
            📚 Add from Content Library
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search content..."
            className="pl-9 bg-white border-stone-300 text-stone-800"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && (
            <p className="text-center text-stone-400 py-8 text-sm">No content found.</p>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => { onSelect(m); onOpenChange(false); }}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-2.5 hover:border-stone-400 transition-all text-left"
            >
              {isAudio(m) ? (
                <div className="w-14 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-stone-100 text-xl">🎵</div>
              ) : getThumbnail(m) ? (
                <img src={getThumbnail(m)} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-10 rounded-lg flex-shrink-0 bg-stone-100 flex items-center justify-center text-xl">📹</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-stone-700 font-semibold text-sm truncate">{m.title}</p>
                <p className="text-stone-400 text-xs">{isAudio(m) ? "🎧 Audio" : "▶ Video"} · {m.difficulty_level || "All"}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}