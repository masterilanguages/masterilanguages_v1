import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Users, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AvatarMenu({ 
  open, 
  onClose, 
  onChangeAvatar, 
  onRestartLife, 
  avatarName 
}) {
  const [confirmRestart, setConfirmRestart] = React.useState(false);

  const handleRestartConfirm = () => {
    setConfirmRestart(false);
    onRestartLife();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Avatar Options</DialogTitle>
            <DialogDescription className="text-white/60">
              Manage {avatarName}'s journey
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { onChangeAvatar(); onClose(); }}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl hover:border-purple-400 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Change Avatar</p>
                <p className="text-white/60 text-sm">Pick a different character</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setConfirmRestart(true)}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl hover:border-red-400 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Restart Life</p>
                <p className="text-white/60 text-sm">Start over as a 3-year-old baby</p>
              </div>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restart Confirmation Dialog */}
      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent className="bg-slate-900 border-red-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Restart Life?
            </DialogTitle>
            <DialogDescription className="text-white/60">
              This will reset {avatarName} back to age 3. Your coins and items will be kept, but all progress will be lost.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmRestart(false)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestartConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Yes, Restart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}