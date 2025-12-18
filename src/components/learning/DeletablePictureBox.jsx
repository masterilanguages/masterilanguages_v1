import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeletablePictureBox({ 
  children, 
  onDelete, 
  canDelete = true,
  className = "" 
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowConfirm(false);
  };

  if (!canDelete) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
        
        <AnimatePresence>
          {(isHovered || window.innerWidth < 768) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center shadow-lg z-10 backdrop-blur-sm"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Delete this image?</DialogTitle>
          </DialogHeader>
          <p className="text-white/60">This action cannot be undone.</p>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowConfirm(false)}
              variant="outline"
              className="flex-1 border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}