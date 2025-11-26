import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickAddWord() {
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordbank'] });
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success("Word added!");
      setWord("");
      setMeaning("");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word.trim()) return;
    
    let translation = meaning.trim();
    
    // If no meaning provided, generate it
    if (!translation) {
      setIsGenerating(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `What is the English translation of the Hebrew word "${word}"? Just provide the translation, nothing else.`,
          response_json_schema: {
            type: "object",
            properties: {
              translation: { type: "string" }
            }
          }
        });
        translation = result.translation;
      } catch (error) {
        toast.error("Could not generate meaning");
        setIsGenerating(false);
        return;
      }
      setIsGenerating(false);
    }
    
    addMutation.mutate({
      word: word,
      translation: translation,
      phonetic: word,
      category: "wordbank",
      difficulty: "beginner",
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-2 bg-white rounded-xl shadow-lg border border-violet-200 p-4 w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-violet-700 text-sm">Quick Add Word</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input
                placeholder="Word (transliteration)"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="text-sm"
              />
              <div className="relative">
                <Input
                  placeholder="Meaning (optional)"
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  className="text-sm pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!word.trim() || isGenerating}
                  onClick={async () => {
                    if (!word.trim()) return;
                    setIsGenerating(true);
                    try {
                      const result = await base44.integrations.Core.InvokeLLM({
                        prompt: `What is the English translation of the Hebrew word "${word}"? Just provide the translation, nothing else.`,
                        response_json_schema: {
                          type: "object",
                          properties: {
                            translation: { type: "string" }
                          }
                        }
                      });
                      setMeaning(result.translation);
                    } catch (error) {
                      toast.error("Could not translate");
                    }
                    setIsGenerating(false);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-xs text-violet-600 hover:text-violet-700"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Translate"}
                </Button>
              </div>
              <Button 
                type="submit" 
                disabled={!word.trim() || addMutation.isPending || isGenerating}
                className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-sm"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-1" /> Add to Word Bank</>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-auto px-4 py-3 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-lg"
      >
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <><Plus className="w-5 h-5 mr-1" /> Add a word</>}
      </Button>
    </div>
  );
}