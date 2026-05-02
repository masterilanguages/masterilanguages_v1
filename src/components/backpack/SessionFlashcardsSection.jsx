import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronRight, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SessionFlashcardsSection({ userProfile, onSessionSelect }) {
  const navigate = useNavigate();
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionWords, setSessionWords] = useState({}); // { [dayId]: [{phonetic, translation, hebrew}] }
  const [loadingSession, setLoadingSession] = useState({});
  const [cardIndices, setCardIndices] = useState({}); // { [dayId]: currentCardIndex }

  const { data: days = [] } = useQuery({
    queryKey: ['days', userProfile?.language],
    queryFn: () => base44.entities.Day.filter({ language: userProfile.language }),
    enabled: !!userProfile?.language,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mediaLibrary = [] } = useQuery({
    queryKey: ['mediaLibrary', userProfile?.language],
    queryFn: () => base44.entities.MediaLibrary.filter({ language: userProfile.language, is_active: true }),
    enabled: !!userProfile?.language,
    staleTime: 5 * 60 * 1000,
  });

  // Days that have at least one subsection with a video_id or mediaUrl (content uploaded)
  // Only show content that matches the user's language
  const userLang = userProfile?.language || 'hebrew';
  const sessionsWithContent = days
    .filter(d => {
      const hasContent = (d.subsections || []).some(s => {
        const taskName = s.name?.toLowerCase() || '';
        // Filter Hebrew-only content
        if (taskName.includes('the bride') && userLang !== 'hebrew') return false;
        return s.video_id || s.mediaUrl || s.youtube_url;
      });
      return hasContent;
    })
    .sort((a, b) => a.day_number - b.day_number)
    .slice(0, 3);

  if (sessionsWithContent.length === 0) return null;

  const extractWordsFromSession = async (day) => {
    setLoadingSession(prev => ({ ...prev, [day.id]: true }));

    let words = [];

    for (const subsection of (day.subsections || [])) {
      const videoId = subsection.video_id;
      if (videoId) {
        const media = mediaLibrary.find(m => m.video_id === videoId);
        // Use pre-stored vocab words if available (no AI call needed)
        if (media?.session_vocab_words?.length) {
          words = [...words, ...media.session_vocab_words];
        } else if (media?.processed_transcript?.length) {
          // Fall back to AI extraction if no pre-stored words
          try {
            const text = media.processed_transcript.map(t => t.hebrew || t.transliteration || t.text || '').join(' ');
            if (text.trim()) {
              const lang = media.language || userProfile?.language || 'hebrew';
              const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
              const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract 8-12 important vocabulary words from this ${langCap} transcript. Only meaningful content words. Transcript: "${text.slice(0, 3000)}". Return JSON with a "words" array, each: { phonetic: Latin transliteration, translation: English (1-4 words), hebrew: native script }.`,
                response_json_schema: {
                  type: 'object',
                  properties: {
                    words: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          phonetic: { type: 'string' },
                          translation: { type: 'string' },
                          hebrew: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              });
              words = [...words, ...(result?.words || [])];
            }
          } catch (e) {
            console.error('Failed to extract words', e);
          }
        }
      }
    }

    // Deduplicate by phonetic
    const seen = new Set();
    words = words.filter(w => {
      const key = (w.phonetic || w.hebrew || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setSessionWords(prev => ({ ...prev, [day.id]: words }));
    setLoadingSession(prev => ({ ...prev, [day.id]: false }));
  };

  const handleToggleSession = (day) => {
    if (expandedSession === day.id) {
      setExpandedSession(null);
    } else {
      setExpandedSession(day.id);
      if (!sessionWords[day.id] && !loadingSession[day.id]) {
        extractWordsFromSession(day);
      }
    }
  };

  const handleSessionWordLoaded = (day) => {
    const words = sessionWords[day.id];
    if (words && words.length > 0) {
      const flashcardWords = words.map(w => ({
        word: w.hebrew || w.phonetic,
        phonetic: w.phonetic,
        translation: w.translation,
      }));
      if (onSessionSelect) {
        onSessionSelect(flashcardWords, `Session ${day.day_number}`);
      }
    }
  };

  const handleStartFlashcards = (day) => {
    const words = sessionWords[day.id] || [];
    if (!words.length) return;
    // Store words in sessionStorage and navigate to a flashcard view
    sessionStorage.setItem('sessionFlashcardWords', JSON.stringify({
      sessionLabel: `Session ${day.day_number}`,
      words,
    }));
    navigate('/Backpack?sessionFlashcard=1');
  };

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold mb-3" style={{ color: '#3d4a2e', fontFamily: 'Jost, sans-serif' }}>
        📖 Session Words
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {sessionsWithContent.map((day) => {
          const isExpanded = expandedSession === day.id;
          const words = sessionWords[day.id] || [];
          const isLoading = loadingSession[day.id];

          return (
            <div key={day.id} className="bg-white/60 border border-stone-200 rounded-xl overflow-hidden flex flex-col">
              {/* Header */}
              <button
                onClick={() => handleToggleSession(day)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/80 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📚</span>
                  <span className="font-semibold text-sm" style={{ color: '#3d4a2e' }}>
                    Session {day.day_number} Words
                  </span>
                </div>
                <ChevronRight
                  className="w-4 h-4 transition-transform"
                  style={{ color: '#6b7c5a', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Expanded content */}
              {isExpanded && words.length > 0 && !isLoading && (
                <div className="border-t border-stone-100 mt-2 pt-3">
                  {handleSessionWordLoaded(day)}
                </div>
              )}
            </div>
          );
        })}
        
        {/* All words button */}
        <button
          onClick={() => {
            sessionStorage.setItem('pendingFlashcardWords', JSON.stringify({
              words: [],
              title: 'All Words',
              allWords: true,
            }));
            navigate('/Backpack?flashcard=all');
          }}
          className="bg-white/60 border border-stone-200 rounded-xl overflow-hidden flex items-center justify-between px-4 py-3 hover:bg-white/80 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⭐</span>
            <span className="font-semibold text-sm" style={{ color: '#3d4a2e' }}>
              All Words
            </span>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: '#6b7c5a' }} />
        </button>
      </div>
    </div>
  );
}