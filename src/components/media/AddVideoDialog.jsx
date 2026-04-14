import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const topics = [
  "Religion / Spirituality", "Sports / Fitness", "Cooking / Food", "Nutrition",
  "Health / Wellness", "Meditation / Mindfulness", "Music", "Travel", "Culture",
  "Education / Learning", "Business / Career", "Personal Growth", "Relationships", "News / Current Events"
];

const tagOptions = ['Learning', 'Hebrew', 'Beginner', 'Intermediate', 'Advanced', 'Grammar', 'Vocabulary', 'Conversation', 'Music', 'Stories', 'Culture', 'Daily Routine', 'Business', 'Travel', 'Food', 'Health'];

export default function AddVideoDialog({ open, onOpenChange, editingVideo, formData, setFormData, mediaType, setMediaType, uploadingAudio, onSubmit, onCancel, onAudioUpload, onLoadYoutube, isPending }) {
  const toggleTopic = (topic) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic) ? prev.topics.filter(t => t !== topic) : [...prev.topics, topic]
    }));
  };

  const toggleTag = (tag, checked) => {
    let tagsList = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (checked) { tagsList.push(tag); } else { tagsList = tagsList.filter(t => t !== tag); }
    setFormData(prev => ({ ...prev, tags: tagsList.join(', ') }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingVideo ? "Edit Media" : "Add Media to Library"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
              {["video", "audio", "song"].map(type => (
                <Button key={type} type="button" onClick={() => setMediaType(type)} className={mediaType === type ? "bg-cyan-500" : "bg-white/10"}>
                  {type === "video" ? "📹 Video" : type === "audio" ? "🎵 Audio" : "🎶 Song"}
                </Button>
              ))}
          </div>

          {mediaType === "video" ? (
            <div>
              <Label>Video URL *</Label>
              <div className="flex gap-2">
                <Input value={formData.video_url} onChange={(e) => setFormData(p => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="bg-white/5 border-white/20 text-white flex-1" />
                <Button type="button" onClick={() => onLoadYoutube(formData.video_url)} disabled={!formData.video_url} className="bg-cyan-500 hover:bg-cyan-600">Load</Button>
              </div>
            </div>
          ) : (
            <div>
              <Label>Upload {mediaType === "audio" ? "MP3 Audio" : "Song (MP3)"} *</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg" onChange={onAudioUpload} className="bg-white/5 border-white/20 text-white flex-1" disabled={uploadingAudio} />
                {uploadingAudio && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
              </div>
              {formData.video_url && <p className="text-xs text-green-400 mt-1">✓ Uploaded</p>}
            </div>
          )}

          <div>
            <Label>Video ID * (auto-populated)</Label>
            <Input value={formData.video_id} readOnly placeholder="Auto-populated from URL" className="bg-white/5 border-white/20 text-white/60" />
          </div>

          <div>
            <Label>Title * (editable)</Label>
            <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Auto-populated from YouTube" className="bg-white/5 border-white/20 text-white" />
          </div>

          <div>
            <Label>Designate to Session (Day)</Label>
            <Input type="number" min="1" max="100" value={formData.default_day} onChange={(e) => setFormData(p => ({ ...p, default_day: e.target.value }))} placeholder="Which session? (1-100)" className="bg-white/5 border-white/20 text-white" />
            <p className="text-xs text-white/50 mt-1">Video will auto-populate in this session's schedule</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Language *</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData(p => ({ ...p, language: val }))}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["hebrew","english","spanish","french","portuguese","italian"].map(l => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={formData.difficulty_level} onValueChange={(val) => setFormData(p => ({ ...p, difficulty_level: val }))}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Beginner","Intermediate","Advanced","All"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Topics</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {topics.map(topic => (
                <button key={topic} type="button" onClick={() => toggleTopic(topic)} className={`text-sm px-3 py-2 rounded border transition-all ${formData.topics.includes(topic) ? 'bg-cyan-500/30 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}>{topic}</button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-white/80 cursor-pointer">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
            Active
          </label>

          <div>
            <Label>Transcript</Label>
            <p className="text-xs text-white/60 mb-2">Paste transcript in any language (target language, English, or phonetics). System will generate the target language text + English translation for each sentence.</p>
            <Textarea value={formData.transcript_phonetics} onChange={(e) => setFormData(p => ({ ...p, transcript_phonetics: e.target.value }))} placeholder="Paste transcript here (Spanish, English, Hebrew, etc.)..." className="bg-white/5 border-white/20 text-white" rows={6} />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={isPending} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingVideo ? "Updating..." : "Adding..."}</> : editingVideo ? "Update Video" : "Add to Library"}
            </Button>
            <Button onClick={onCancel} variant="outline" className="border-white/20">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}