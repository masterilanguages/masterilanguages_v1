import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const PERSONS = [
  { key: "i",     label: "I (אני)" },
  { key: "you_m", label: "You m. (אתה)" },
  { key: "you_f", label: "You f. (את)" },
  { key: "he",    label: "He (הוא)" },
  { key: "she",   label: "She (היא)" },
  { key: "we",    label: "We (אנחנו)" },
  { key: "they",  label: "They (הם)" },
];

export default function TranslatorWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [learningLanguage, setLearningLanguage] = useState("hebrew");
  const [wordAdded, setWordAdded] = useState(false);
  const [grammarAdded, setGrammarAdded] = useState(false);
  const [isAddingGrammar, setIsAddingGrammar] = useState(false);
  const [showConjugations, setShowConjugations] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAskingAI, setIsAskingAI] = useState(false);

  React.useEffect(() => {
    base44.entities.UserProfile.list().then(profiles => {
      if (profiles[0]?.language) setLearningLanguage(profiles[0].language);
    });
  }, []);

  const createWordMutation = useMutation({
    mutationFn: (wordData) => base44.entities.Word.create(wordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Added to flashcards! 🎒");
      setWordAdded(true);
    },
  });

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setTranslation(null);
    setWordAdded(false);
    setGrammarAdded(false);
    setShowConjugations(false);

    try {
      const trimmed = inputText.trim();
      const isEnglish = /^[a-zA-Z\s\.,!?'"\-]+$/.test(trimmed);

      const prompt = `You are an expert Hebrew linguist. The user typed: "${trimmed}"

Detect whether the input is:
A) English → translate to Hebrew
B) Hebrew letters → translate to English  
C) Latin/Roman letters = Hebrew transliteration → identify the Hebrew word and translate to English

Return a JSON object with ALL of these fields (never leave hebrew or transliteration empty):

- "hebrew": the Hebrew word/phrase WITH full nikud (vowel points). REQUIRED - never empty.
- "transliteration": clean Latin phonetic pronunciation. REQUIRED - never empty. 
- "english": clear English meaning/translation. REQUIRED.
- "part_of_speech": one of: noun, verb, adjective, adverb, phrase, exclamation, preposition, conjunction
- "gender": "masculine", "feminine", or "none" (for nouns/adjectives)
- "plural": Hebrew plural form with nikud (for nouns)
- "plural_transliteration": plural transliteration
- "alternatives": array of 1-3 alternative translations or usage examples (strings)
- "example_sentence_hebrew": a short natural example sentence in Hebrew with nikud
- "example_sentence_transliteration": transliteration of the example sentence
- "example_sentence_english": English translation of the example
- "notes": usage notes, register (formal/informal/slang), cultural context (1-2 sentences max)
- "is_verb": true if it's a verb
- "root": 3-letter Hebrew root (shoresh) if verb or derivable
- "infinitive": verb infinitive in transliteration (if verb)
- "infinitive_hebrew": verb infinitive in Hebrew with nikud (if verb)
- "binyan": Hebrew verb pattern name (if verb)
- "grammar_rule": brief grammar note about the binyan/pattern (if verb, 1-2 sentences)
- "conjugations": object with past/present/future tenses, each containing keys: i, you_m, you_f, he, she, we, they — each with "native" (Hebrew with nikud) and "transliteration" fields

IMPORTANT: hebrew and transliteration fields are MANDATORY and must always have a value.`;

      const schema = {
        type: "object",
        properties: {
          hebrew: { type: "string" },
          transliteration: { type: "string" },
          english: { type: "string" },
          part_of_speech: { type: "string" },
          gender: { type: "string" },
          plural: { type: "string" },
          plural_transliteration: { type: "string" },
          alternatives: { type: "array", items: { type: "string" } },
          example_sentence_hebrew: { type: "string" },
          example_sentence_transliteration: { type: "string" },
          example_sentence_english: { type: "string" },
          notes: { type: "string" },
          is_verb: { type: "boolean" },
          root: { type: "string" },
          infinitive: { type: "string" },
          infinitive_hebrew: { type: "string" },
          binyan: { type: "string" },
          grammar_rule: { type: "string" },
          conjugations: { type: "object" }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({ 
        prompt, 
        response_json_schema: schema, 
        model: "claude_sonnet_4_6" 
      });
      setTranslation(result);
    } catch (e) {
      toast.error("Translation failed");
    }
    setIsTranslating(false);
  };

  const handleAddToBackpack = () => {
    if (!translation) return;
    createWordMutation.mutate({
      word: translation.hebrew,
      translation: translation.english,
      phonetic: translation.transliteration,
      category: "wordbank",
      is_verb: translation.is_verb || false,
      verb_conjugations: translation.is_verb ? translation.conjugations : undefined,
      example_sentence: translation.example_sentence_hebrew || "",
      times_practiced: 0,
      mastered: false,
      vocab_level: 0,
    });
  };

  const handleAddToGrammar = async () => {
    if (!translation || !translation.is_verb) return;
    setIsAddingGrammar(true);
    try {
      // Check if word already exists as a verb in Word entity
      const existing = await base44.entities.Word.filter({ phonetic: translation.infinitive || translation.transliteration });
      if (existing.length > 0) {
        // Update with conjugations
        await base44.entities.Word.update(existing[0].id, {
          is_verb: true,
          verb_conjugations: translation.conjugations,
        });
      } else {
        // Create new Word entry with verb data
        await base44.entities.Word.create({
          word: translation.infinitive_hebrew || translation.hebrew,
          translation: translation.english,
          phonetic: translation.infinitive || translation.transliteration,
          category: "wordbank",
          is_verb: true,
          verb_conjugations: translation.conjugations,
          example_sentence: translation.grammar_rule || "",
          times_practiced: 0,
          mastered: false,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
      toast.success("Verb added to Grammar! 📖");
      setGrammarAdded(true);
    } catch (e) {
      toast.error("Failed to save grammar");
    }
    setIsAddingGrammar(false);
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !translation) return;
    setIsAskingAI(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful language teacher. The user is learning about the word:
        - Hebrew: ${translation.hebrew}
        - Transliteration: ${translation.transliteration}
        - English: ${translation.english}
        User's question: ${aiQuestion}
        Provide a clear, concise answer (2-3 sentences max).`
      });
      setAiAnswer(result);
    } catch (e) {
      toast.error("Failed to get AI response");
    }
    setIsAskingAI(false);
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-xl bg-white text-slate-900 shadow-lg flex items-center justify-center font-bold"
        >
          Translate
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-50 w-80 bg-slate-950/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">Translate</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a word or verb..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
              />
              {translation && (
                <button
                  onClick={handleAddToBackpack}
                  disabled={createWordMutation.isPending || wordAdded}
                  className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-lg transition-all ${
                    wordAdded ? 'bg-green-500/30 text-green-400' : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                  } disabled:opacity-50`}
                  title="Add to backpack"
                >
                  {wordAdded ? '✓' : '🎒'}
                </button>
              )}
              <Button
                onClick={handleTranslate}
                disabled={!inputText.trim() || isTranslating}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
              </Button>
            </div>

            {translation && (
              <div className="space-y-2">
                {/* Main result card: Hebrew + transliteration + English */}
                <div className="bg-white/8 border border-white/15 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-cyan-300 text-2xl font-bold leading-tight" dir="rtl">{translation.hebrew}</p>
                      <p className="text-white/70 text-sm mt-0.5">{translation.transliteration}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-300 text-lg font-bold">{translation.english}</p>
                      {translation.part_of_speech && (
                        <span className="text-[10px] text-white/40 uppercase tracking-wide">{translation.part_of_speech}</span>
                      )}
                    </div>
                  </div>

                  {/* Gender + Plural */}
                  {(translation.gender && translation.gender !== 'none') || translation.plural ? (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-white/10">
                      {translation.gender && translation.gender !== 'none' && (
                        <span className="text-xs text-white/50">
                          <span className="text-white/30">gender: </span>
                          <span className="text-amber-300">{translation.gender}</span>
                        </span>
                      )}
                      {translation.plural && (
                        <span className="text-xs text-white/50">
                          <span className="text-white/30">plural: </span>
                          <span className="text-cyan-300" dir="rtl">{translation.plural}</span>
                          {translation.plural_transliteration && (
                            <span className="text-white/50"> ({translation.plural_transliteration})</span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Alternative meanings */}
                {translation.alternatives && translation.alternatives.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-2.5">
                    <p className="text-white/40 text-[10px] uppercase font-semibold mb-1.5">Also means</p>
                    <div className="flex flex-wrap gap-1.5">
                      {translation.alternatives.map((alt, i) => (
                        <span key={i} className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">{alt}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Example sentence */}
                {translation.example_sentence_hebrew && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                    <p className="text-white/40 text-[10px] uppercase font-semibold mb-1">Example</p>
                    <p className="text-emerald-300 text-sm font-medium" dir="rtl">{translation.example_sentence_hebrew}</p>
                    {translation.example_sentence_transliteration && (
                      <p className="text-white/50 text-xs mt-0.5 italic">{translation.example_sentence_transliteration}</p>
                    )}
                    {translation.example_sentence_english && (
                      <p className="text-white/60 text-xs mt-0.5">"{translation.example_sentence_english}"</p>
                    )}
                  </div>
                )}

                {/* Verb info */}
                {translation.is_verb && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">VERB</span>
                      {translation.binyan && <span className="text-purple-300 text-xs">{translation.binyan}</span>}
                      {translation.root && <span className="text-white/50 text-xs" dir="rtl">root: <span className="text-cyan-300 font-bold">{translation.root}</span></span>}
                      {translation.infinitive && <span className="text-white/50 text-xs">∞ {translation.infinitive}</span>}
                    </div>
                    {translation.grammar_rule && (
                      <p className="text-white/60 text-xs leading-relaxed">{translation.grammar_rule}</p>
                    )}
                  </div>
                )}

                {/* Conjugations accordion */}
                {translation.is_verb && translation.conjugations && (
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowConjugations(!showConjugations)}
                      className="w-full flex items-center justify-between px-3 py-2 text-white/70 hover:text-white text-xs font-semibold"
                    >
                      <span>📊 Conjugations (Past / Present / Future)</span>
                      {showConjugations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showConjugations && (
                      <div className="px-3 pb-3 space-y-3">
                        {["past", "present", "future"].map(tense => (
                          translation.conjugations[tense] && (
                            <div key={tense}>
                              <p className="text-amber-400 text-[10px] font-bold uppercase mb-1">{tense}</p>
                              <div className="space-y-0.5">
                                {PERSONS.map(p => {
                                  const c = translation.conjugations[tense][p.key];
                                  if (!c) return null;
                                  return (
                                    <div key={p.key} className="flex items-center justify-between text-xs">
                                      <span className="text-white/40 w-24 flex-shrink-0">{p.label}</span>
                                      <span className="text-cyan-300 font-medium flex-1 text-center" dir="rtl">{c.native}</span>
                                      <span className="text-white/60 text-right flex-shrink-0">{c.transliteration}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add to grammar button for verbs */}
                {translation.is_verb && (
                  <button
                    onClick={handleAddToGrammar}
                    disabled={isAddingGrammar || grammarAdded}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      grammarAdded
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30'
                    } disabled:opacity-50`}
                  >
                    {isAddingGrammar ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>{grammarAdded ? '✓' : '📖'}</span>}
                    {grammarAdded ? 'Added to Grammar!' : 'Save verb + conjugations to Grammar'}
                  </button>
                )}

                {/* Usage notes */}
                {translation.notes && (
                  <div className="bg-blue-500/10 rounded-lg p-2.5">
                    <p className="text-blue-300/80 text-xs leading-relaxed">💡 {translation.notes}</p>
                  </div>
                )}

                {/* AI Ask */}
                {aiAnswer && (
                  <div className="bg-purple-500/10 rounded-lg p-2.5 border border-purple-500/20">
                    <p className="text-purple-300 text-[10px] uppercase font-semibold mb-1">AI Answer</p>
                    <p className="text-white/80 text-xs leading-relaxed">{aiAnswer}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask about this word..."
                    className="bg-white/10 border-white/20 text-white text-sm placeholder:text-white/40"
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  />
                  <Button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || isAskingAI}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {isAskingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}