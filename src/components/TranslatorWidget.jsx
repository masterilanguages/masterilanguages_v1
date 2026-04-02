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
    if (!inputText.trim() || !learningLanguage) return;
    setIsTranslating(true);
    setTranslation(null);
    setWordAdded(false);
    setGrammarAdded(false);
    setShowConjugations(false);

    try {
      const isEnglish = /^[a-zA-Z\s\.,!?'-]+$/.test(inputText.trim());
      const targetLangName = learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1);

      const prompt = isEnglish
        ? `You are an expert English→${targetLangName} translator for a language-learning app.
Output MUST be valid JSON only.
Input: "${inputText}"

Detect if this word is a VERB. If it is a verb, set "is_verb" to true and provide full conjugations.

Provide:
- "english": English meaning
- "target_language": ${targetLangName} with nikud
- "transliteration": Latin phonetic
- "alternatives": array (may be empty)
- "notes": grammar note or empty string
- "is_verb": boolean
- "infinitive": infinitive form transliteration (if verb, else null)
- "infinitive_hebrew": infinitive in Hebrew with nikud (if verb, else null)
- "root": Hebrew root letters (if verb, else null)
- "grammar_rule": short grammar rule explanation (if verb, else null)
- "conjugations": object with "past", "present", "future" tenses, each containing keys: i, you_m, you_f, he, she, we, they — each being {transliteration, native} (if verb, else null)`
        : `You are an expert transliterated-${targetLangName}→English interpreter for a language-learning app.
Input is ${targetLangName} written in Latin letters, possibly with inconsistent spelling.
Input: "${inputText}"

Detect if this word is a VERB. If it is a verb, set "is_verb" to true and provide full conjugations.

Provide:
- "english": English meaning
- "target_language": reconstructed ${targetLangName} with nikud
- "transliteration": normalized transliteration
- "alternatives": array (may be empty)
- "is_verb": boolean
- "infinitive": infinitive form transliteration (if verb, else null)
- "infinitive_hebrew": infinitive in Hebrew with nikud (if verb, else null)
- "root": Hebrew root letters (if verb, else null)
- "grammar_rule": short grammar rule explanation (if verb, else null)
- "conjugations": object with "past", "present", "future" tenses, each containing keys: i, you_m, you_f, he, she, we, they — each being {transliteration, native} (if verb, else null)`;

      const schema = {
        type: "object",
        properties: {
          english: { type: "string" },
          target_language: { type: "string" },
          transliteration: { type: "string" },
          alternatives: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          is_verb: { type: "boolean" },
          infinitive: { type: "string" },
          infinitive_hebrew: { type: "string" },
          root: { type: "string" },
          grammar_rule: { type: "string" },
          conjugations: { type: "object" }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
      result.hebrew = result.target_language;
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
      times_practiced: 0,
      mastered: false,
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
          className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg flex items-center justify-center font-medium"
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
            className="fixed bottom-20 left-4 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto"
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
                {/* English meaning */}
                {translation.english && (
                  <div className="bg-green-500/15 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-400 text-[10px] font-semibold mb-1">ENGLISH MEANING</p>
                    <p className="text-green-300 text-lg font-bold">{translation.english}</p>
                  </div>
                )}

                {/* Hebrew + Pronunciation */}
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-[10px] mb-1">HEBREW</p>
                  <p className="text-cyan-400 text-lg font-bold" dir="rtl">{translation.hebrew}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-[10px] mb-1">PRONUNCIATION</p>
                  <p className="text-white">{translation.transliteration}</p>
                </div>

                {/* Verb badge + grammar rule */}
                {translation.is_verb && (
                  <div className="bg-purple-500/15 border border-purple-500/40 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-semibold">VERB</span>
                      {translation.infinitive && (
                        <span className="text-purple-300 text-xs">∞ {translation.infinitive}</span>
                      )}
                      {translation.root && (
                        <span className="text-purple-300 text-xs font-bold" dir="rtl">root: {translation.root}</span>
                      )}
                    </div>
                    {translation.grammar_rule && (
                      <p className="text-white/70 text-xs leading-relaxed">{translation.grammar_rule}</p>
                    )}
                  </div>
                )}

                {/* Conjugations accordion */}
                {translation.is_verb && translation.conjugations && (
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowConjugations(!showConjugations)}
                      className="w-full flex items-center justify-between px-3 py-2 text-white/80 hover:text-white text-xs font-semibold"
                    >
                      <span>📊 View Conjugations (Past / Present / Future)</span>
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
                                      <span className="text-white/50 w-24">{p.label}</span>
                                      <span className="text-cyan-400 font-medium" dir="rtl">{c.native}</span>
                                      <span className="text-white/70 text-right">{c.transliteration}</span>
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

                {translation.notes && (
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <p className="text-blue-300 text-xs">{translation.notes}</p>
                  </div>
                )}

                {/* Action buttons */}
                <button
                  onClick={handleAddToBackpack}
                  disabled={createWordMutation.isPending || wordAdded}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    wordAdded
                      ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  } disabled:opacity-50`}
                >
                  <span className="text-lg">{wordAdded ? '✓' : '🎒'}</span>
                  {wordAdded ? 'Added to Flashcards!' : 'Add to My Flashcards'}
                </button>

                {translation.is_verb && (
                  <button
                    onClick={handleAddToGrammar}
                    disabled={isAddingGrammar || grammarAdded}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      grammarAdded
                        ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                    } disabled:opacity-50`}
                  >
                    {isAddingGrammar ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-lg">{grammarAdded ? '✓' : '📖'}</span>}
                    {grammarAdded ? 'Added to Grammar!' : 'Add to Grammar (with conjugations)'}
                  </button>
                )}

                {/* AI Ask */}
                {aiAnswer && (
                  <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                    <p className="text-purple-300 text-xs mb-1">AI ANSWER</p>
                    <p className="text-white text-sm">{aiAnswer}</p>
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