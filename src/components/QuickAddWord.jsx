import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ChevronDown, Loader2, Search, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickAddWord() {
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [translateDirection, setTranslateDirection] = useState("en-to-he"); // "en-to-he" or "he-to-en"
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
            className="mb-2 bg-white rounded-xl shadow-lg border border-violet-200 p-4 w-72"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-violet-700 text-sm">
                {searchMode ? "Search Words" : "Quick Add Word"}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {searchMode ? (
                                <div className="space-y-2">
                                  <Input
                                    placeholder="Search by word or meaning..."
                                    value={searchQuery}
                                    onChange={async (e) => {
                                      setSearchQuery(e.target.value);
                                      if (e.target.value.length >= 2) {
                                        const words = await base44.entities.Word.list();
                                        const q = e.target.value.toLowerCase();
                                        setSearchResults(words.filter(w => 
                                          w.word?.toLowerCase().includes(q) || 
                                          w.phonetic?.toLowerCase().includes(q) || 
                                          w.translation?.toLowerCase().includes(q)
                                        ).slice(0, 5));
                                      } else {
                                        setSearchResults([]);
                                      }
                                    }}
                                    className="text-sm"
                                    autoFocus
                                  />
                                  {searchResults.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {searchResults.map(w => (
                                        <div key={w.id} className="p-2 bg-violet-50 rounded-lg text-sm">
                                          <span className="font-medium text-violet-700">{w.phonetic}</span>
                                          <span className="text-gray-400 mx-1">•</span>
                                          <span className="text-gray-600">{w.translation}</span>
                                          {w.word !== w.phonetic && (
                                            <span className="text-gray-400 text-xs ml-1" dir="rtl">({w.word})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <p className="text-gray-400 text-sm text-center py-2">No words found</p>
                                  )}
                                </div>
                              ) : (
                                <form onSubmit={handleSubmit} className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <button
                                      type="button"
                                      onClick={() => setTranslateDirection(translateDirection === "en-to-he" ? "he-to-en" : "en-to-he")}
                                      className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-1 rounded-full"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      {translateDirection === "en-to-he" ? "English → Hebrew" : "Hebrew → English"}
                                    </button>
                                  </div>
                                  <Input
                                    placeholder={translateDirection === "en-to-he" ? "English word" : "Transliterated Hebrew"}
                                    value={word}
                                    onChange={(e) => setWord(e.target.value)}
                                    className="text-sm"
                                  />
                                  <div className="relative">
                                    <Input
                                      placeholder={translateDirection === "en-to-he" ? "Hebrew (auto)" : "English meaning (auto)"}
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
                                          if (translateDirection === "en-to-he") {
                                            const result = await base44.integrations.Core.InvokeLLM({
                                              prompt: `Translate the English word "${word}" to Hebrew. Provide the transliteration (how to say it in English letters).`,
                                              response_json_schema: {
                                                type: "object",
                                                properties: {
                                                  transliteration: { type: "string" }
                                                }
                                              }
                                            });
                                            setMeaning(word);
                                            setWord(result.transliteration);
                                            setTranslateDirection("he-to-en");
                                          } else {
                                            const result = await base44.integrations.Core.InvokeLLM({
                                              prompt: `What is the English translation of the Hebrew word "${word}"? Just provide the translation.`,
                                              response_json_schema: {
                                                type: "object",
                                                properties: {
                                                  translation: { type: "string" }
                                                }
                                              }
                                            });
                                            setMeaning(result.translation);
                                          }
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
                              )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex gap-2">
        <Button
          onClick={() => { setSearchMode(true); setIsOpen(true); }}
          className="rounded-full h-auto px-3 py-3 bg-white border-2 border-violet-200 text-violet-600 hover:bg-violet-50 shadow-lg"
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => { setSearchMode(false); setIsOpen(!isOpen); }}
          className="rounded-full h-auto px-4 py-3 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-lg"
        >
          {isOpen && !searchMode ? <ChevronDown className="w-5 h-5" /> : <><Plus className="w-5 h-5 mr-1" /> Add</>}
        </Button>
      </div>
    </div>
  );
}