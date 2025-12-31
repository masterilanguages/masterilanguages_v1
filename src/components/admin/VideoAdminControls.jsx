import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function VideoAdminControls({ video, onUpdate, onDelete, onReplaceUrl }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: video.title || "",
    level: video.level || 1,
    tags: video.tags || "",
    notes: video.notes || ""
  });
  
  const [newUrl, setNewUrl] = useState("");

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
    return match ? match[1] : null;
  };

  const handleSaveEdit = async () => {
    try {
      await onUpdate({
        title: editForm.title,
        level: parseInt(editForm.level) || 1,
        tags: editForm.tags,
        notes: editForm.notes
      });
      setShowEditDialog(false);
      toast.success("Video updated!");
    } catch (e) {
      toast.error("Failed to update video");
    }
  };

  const handleReplaceUrl = async () => {
    const ytId = extractYouTubeId(newUrl);
    
    if (!ytId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    try {
      await onReplaceUrl({
        video_url: newUrl,
        youtube_video_id: ytId,
        transcript_status: "needs_refresh",
        caption_track_id: null,
        transcript_text: null
      });
      setShowReplaceDialog(false);
      setNewUrl("");
      toast.success("Video URL replaced! Transcript will be regenerated.");
    } catch (e) {
      toast.error("Failed to replace URL");
    }
  };

  const handleDelete = async () => {
    console.log('handleDelete called');
    try {
      const deleteData = {
        deleted_at: new Date().toISOString(),
        is_active: false
      };
      console.log('calling onDelete with:', deleteData);
      await onDelete(deleteData);
      setShowDeleteDialog(false);
      toast.success("Video deleted");
    } catch (e) {
      console.error('handleDelete error:', e);
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}
        variant="outline"
        size="sm"
        className="bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
      >
        <Edit className="w-4 h-4 mr-1" />
        Edit
      </Button>

      <Button
        onClick={(e) => { e.stopPropagation(); setShowReplaceDialog(true); }}
        variant="outline"
        size="sm"
        className="bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
      >
        <RefreshCw className="w-4 h-4 mr-1" />
        Replace URL
      </Button>

      <Button
        onClick={(e) => { 
          e.stopPropagation(); 
          console.log('Delete button clicked, video:', video); 
          setShowDeleteDialog(true); 
        }}
        variant="outline"
        size="sm"
        className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Delete
      </Button>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Level</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={editForm.level}
                onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="beginner, vocabulary, daily life"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1 bg-blue-500 hover:bg-blue-600">
                Save Changes
              </Button>
              <Button onClick={() => setShowEditDialog(false)} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace URL Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Replace Video URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-400">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="text-xs space-y-1 text-amber-400/80">
                    <li>• Current transcript will be cleared</li>
                    <li>• New captions will be fetched automatically</li>
                    <li>• To-Do links will remain intact</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Current URL</Label>
              <p className="text-sm text-white/60 break-all bg-white/5 p-2 rounded border border-white/10">
                {video.video_url}
              </p>
            </div>

            <div>
              <Label>New YouTube URL</Label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleReplaceUrl} 
                disabled={!newUrl.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                Replace URL
              </Button>
              <Button onClick={() => { setShowReplaceDialog(false); setNewUrl(""); }} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium mb-2">Are you sure?</p>
                  <p className="text-sm text-red-400/80">
                    This will remove the video from all lessons and To-Do items. 
                    Any To-Do items pointing to this video will be automatically disabled.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-sm mb-1">Video to delete:</p>
              <p className="text-white font-medium">{video.title}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Delete Video button clicked');
                  handleDelete();
                }} 
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete Video
              </Button>
              <Button onClick={() => setShowDeleteDialog(false)} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}