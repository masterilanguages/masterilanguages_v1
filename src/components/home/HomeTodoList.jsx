import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, GripVertical, Edit, Trash2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function HomeTodoList({ isAdmin = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: todoItems = [], isLoading } = useQuery({
    queryKey: ['todoItems'],
    queryFn: () => base44.entities.TodoItem.filter({ is_active: true }, "order"),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: todoProgress = [] } = useQuery({
    queryKey: ['todoProgress', user?.id],
    queryFn: () => base44.entities.TodoProgress.list(),
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const vids = await base44.entities.Video.list();
      return vids.filter(v => !v.deleted_at || isAdmin);
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (items) => {
      await Promise.all(
        items.map((item, index) => 
          base44.entities.TodoItem.update(item.id, { order: index })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todoItems'] }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
      setEditingItem(null);
      toast.success("Updated!");
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.TodoItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
      setShowAddDialog(false);
      toast.success("Added!");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
      toast.success("Deleted!");
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (todoItemId) => {
      const existing = todoProgress.find(p => p.todo_item_id === todoItemId);
      if (existing) {
        await base44.entities.TodoProgress.update(existing.id, {
          completed: !existing.completed,
          completed_at: !existing.completed ? new Date().toISOString() : null,
        });
      } else {
        await base44.entities.TodoProgress.create({
          todo_item_id: todoItemId,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todoProgress'] }),
  });

  const isCompleted = (todoItemId) => {
    return todoProgress.find(p => p.todo_item_id === todoItemId)?.completed || false;
  };

  const handleItemClick = (item) => {
    if (item.type === "video" && item.target_video_id) {
      navigate(createPageUrl("BabyVideos") + `?videoId=${item.target_video_id}`);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const reordered = Array.from(todoItems);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);
    
    updateOrderMutation.mutate(reordered);
  };

  if (isLoading) {
    return <div className="text-white/60">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">📝 To-Do List</h2>
        {isAdmin && (
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-green-500/20 hover:bg-green-500/30 text-green-400"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        )}
      </div>

      {isAdmin ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="todo-list">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps} 
                className={`space-y-3 min-h-[100px] rounded-xl transition-all ${
                  snapshot.isDraggingOver ? 'bg-cyan-500/10 border-2 border-cyan-500/50 p-2' : ''
                }`}
              >
                {todoItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:from-white/10 hover:to-white/15 transition-all ${
                          snapshot.isDragging ? 'shadow-2xl scale-105 border-cyan-400/50' : ''
                        } ${isCompleted(item.id) ? 'bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30' : ''}`}
                      >
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="w-5 h-5 text-white/40 hover:text-white/60" />
                        </div>
                        <button
                          onClick={() => toggleCompleteMutation.mutate(item.id)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isCompleted(item.id)
                              ? "bg-green-500 border-green-500 shadow-lg"
                              : "border-white/40 hover:border-cyan-400 hover:bg-cyan-500/10"
                          }`}
                        >
                          {isCompleted(item.id) && <Check className="w-5 h-5 text-white" />}
                        </button>
                        <div className="flex-1" onClick={() => handleItemClick(item)}>
                          <p className={`text-white font-medium text-lg ${isCompleted(item.id) ? "line-through opacity-60" : ""}`}>
                            {item.label}
                          </p>
                          {item.type === "video" && (
                            <p className="text-xs text-white/40">Video: {videos.find(v => v.id === item.target_video_id)?.title || "Unknown"}</p>
                          )}
                          {item.type === 'video' && item.target_video_id && !videos.find(v => v.id === item.target_video_id) && (
                            <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Video missing or deleted - needs reassignment</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          className="w-8 h-8 rounded bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteItemMutation.mutate(item.id); }}
                          className="w-8 h-8 rounded bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-3">
          {todoItems.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:from-white/10 hover:to-white/15 transition-all ${
                isCompleted(item.id) ? 'bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleCompleteMutation.mutate(item.id); }}
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                  isCompleted(item.id)
                    ? "bg-green-500 border-green-500 shadow-lg"
                    : "border-white/40 hover:border-cyan-400 hover:bg-cyan-500/10"
                }`}
              >
                {isCompleted(item.id) && <Check className="w-5 h-5 text-white" />}
              </button>
              <div className="flex-1">
                <p className={`text-white font-medium text-lg ${isCompleted(item.id) ? "line-through opacity-60" : ""}`}>
                  {item.label}
                </p>
                {item.type === 'video' && item.target_video_id && !videos.find(v => v.id === item.target_video_id) && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Video missing</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit To-Do Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <EditItemForm
              item={editingItem}
              videos={videos}
              onSave={(data) => updateItemMutation.mutate({ id: editingItem.id, data })}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Add To-Do Item</DialogTitle>
          </DialogHeader>
          <EditItemForm
            item={{ label: "", type: "video", target_video_id: null, order: todoItems.length }}
            videos={videos}
            onSave={(data) => createItemMutation.mutate(data)}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditItemForm({ item, videos, onSave, onCancel }) {
  const [label, setLabel] = useState(item.label || "");
  const [type, setType] = useState(item.type || "video");
  const [targetVideoId, setTargetVideoId] = useState(item.target_video_id || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      label,
      type,
      target_video_id: type === "video" ? targetVideoId : null,
      is_active: true,
      order: item.order || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-white/60 mb-1 block">Label</label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Lesson 1"
          className="bg-white/5 border-white/20 text-white"
          required
        />
      </div>

      <div>
        <label className="text-sm text-white/60 mb-1 block">Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-white/5 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "video" && (
        <div>
          <label className="text-sm text-white/60 mb-1 block">Target Video</label>
          <Select value={targetVideoId} onValueChange={setTargetVideoId}>
            <SelectTrigger className="bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Select a video" />
            </SelectTrigger>
            <SelectContent>
              {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 bg-green-500 hover:bg-green-600">
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </div>
    </form>
  );
}