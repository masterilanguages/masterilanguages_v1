import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ParrotMascot from "../components/mascot/ParrotMascot";

export default function WordBank() {
  const queryClient = useQueryClient();

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['wordbank'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordbank'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-violet-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <ParrotMascot size="sm" message="Words to learn!" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Word Bank
            </h1>
            <p className="text-gray-500">Words you've saved from video transcripts</p>
          </div>
        </div>

        {words.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100">
            <ParrotMascot size="lg" message="No words yet! Click on words in video transcripts to add them here." />
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {words.map((word) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-violet-100 p-4 flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-violet-600">{word.phonetic}</span>
                    <span className="text-gray-600 text-sm">{word.translation}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(word.id)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}