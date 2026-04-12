import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Detect if a word is likely a verb by phonetic pattern
function looksLikeVerb(word) {
  const p = (word.phonetic || word.word || "").toLowerCase();
  return word.is_verb === true || /^l[aeiou]/i.test(p);
}

const TENSES = ["past", "present", "future"];
const TENSE_LABELS = { past: "Past", present: "Present", future: "Future" };

function ConjugationTable({ conjugations }) {
  if (!conjugations) return null;
  const persons = [
    { key: "i", label: "I" },
    { key: "you_m", label: "You (m)" },
    { key: "you_f", label: "You (f)" },
    { key: "he", label: "He" },
    { key: "she", label: "She" },
    { key: "we", label: "We" },
    { key: "you_pl", label: "You (pl)" },
    { key: "they", label: "They" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {TENSES.map(tense => (
        <div key={tense} className="bg-white/80 rounded-lg p-2 border border-stone-100">
          <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{TENSE_LABELS[tense]}</p>
          {persons.map(({ key, label }) => {
            const val = conjugations[tense]?.[key];
            if (!val) return null;
            return (
              <div key={key} className="flex justify-between items-baseline gap-1 py-0.5 border-b border-stone-50 last:border-0">
                <span className="text-[9px] text-stone-400 shrink-0">{label}</span>
                <span className="text-[11px] text-cyan-600 font-medium text-right">{val}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function VerbsTab({ words }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [generating, setGenerating] = useState({});
  const [localConjugations, setLocalConjugations] = useState({});

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const verbWords = words.filter(looksLikeVerb);

  const generateConjugations = async (word) => {
    setGenerating(prev => ({ ...prev, [word.id]: true }));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate Hebrew verb conjugations for the verb "${word.phonetic || word.word}" (meaning: "${word.translation}").

Return JSON with conjugations object containing past, present, future keys.
Each tense is an object with keys: i, you_m, you_f, he, she, we, you_pl, they.
Values should be the transliterated (Latin letters) conjugated form only.`,
        response_json_schema: {
          type: "object",
          properties: {
            conjugations: {
              type: "object",
              properties: {
                past: { type: "object" },
                present: { type: "object" },
                future: { type: "object" },
              }
            }
          }
        }
      });

      const conj = result.conjugations;
      setLocalConjugations(prev => ({ ...prev, [word.id]: conj }));

      if (word.id) {
        await updateWordMutation.mutateAsync({
          id: word.id,
          data: { is_verb: true, verb_conjugations: conj }
        });
      }
      toast.success("Conjugations generated!");
    } catch (e) {
      toast.error("Failed to generate conjugations");
    }
    setGenerating(prev => ({ ...prev, [word.id]: false }));
  };

  const toggleExpand = async (word) => {
    const isExpanded = expanded[word.id];
    setExpanded(prev => ({ ...prev, [word.id]: !isExpanded }));
    // Auto-generate if expanding and no conjugations yet
    if (!isExpanded && !word.verb_conjugations && !localConjugations[word.id] && !generating[word.id]) {
      await generateConjugations(word);
    }
  };

  if (verbWords.length === 0) {
    return <p className="text-stone-400 text-center py-8">No verbs in your backpack yet.</p>;
  }

  return (
    <div className="space-y-2">
      {verbWords.map(word => {
        const conj = localConjugations[word.id] || word.verb_conjugations;
        const isExpanded = expanded[word.id];
        return (
          <div key={word.id} className="bg-white/70 border border-stone-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(word)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <span className="text-cyan-600 font-bold text-base">{word.phonetic || word.word}</span>
                <span className="text-stone-400 text-xs">=</span>
                <span className="text-stone-600 text-sm">{word.translation}</span>
                <span className="text-cyan-700 text-sm font-medium" dir="rtl">{word.word}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {conj && <span className="text-[10px] text-green-500 font-semibold">✓ conjugated</span>}
                {generating[word.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                ) : isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4">
                {generating[word.id] ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
                    <span className="text-stone-400 text-sm">Generating conjugations...</span>
                  </div>
                ) : conj ? (
                  <ConjugationTable conjugations={conj} />
                ) : (
                  <button
                    onClick={() => generateConjugations(word)}
                    className="w-full py-2 rounded-lg text-sm text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all"
                  >
                    Generate conjugations
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}