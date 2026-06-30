"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate, createPageUrl } from "@/lib/router-compat";
import { base44 as base44Client } from "@/api/base44Client";
const base44: any = base44Client;
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import GameHeader from "@/components/dashboard/GameHeader";
import QuickAddWordWidget from "@/components/QuickAddWordWidget";

// anchor = exact point on the body the word refers to
// label  = where the word pill is drawn (offset so pills never overlap each other)
const bodyParts = [
  { id: "hair", hebrew: "שיער", transliteration: "se'ar", meaning: "hair", anchor: { top: "3%", left: "50%" }, label: { top: "2%", left: "82%" } },
  { id: "head", hebrew: "ראש", transliteration: "rosh", meaning: "head", anchor: { top: "8%", left: "50%" }, label: { top: "7%", left: "16%" } },
  { id: "eye", hebrew: "עין", transliteration: "ayin", meaning: "eye", anchor: { top: "11%", left: "45%" }, label: { top: "13%", left: "14%" } },
  { id: "eyes", hebrew: "עיניים", transliteration: "einayim", meaning: "eyes", anchor: { top: "11%", left: "55%" }, label: { top: "13%", left: "86%" } },
  { id: "ear", hebrew: "אוזן", transliteration: "ozen", meaning: "ear", anchor: { top: "12%", left: "38%" }, label: { top: "19%", left: "10%" } },
  { id: "nose", hebrew: "אף", transliteration: "af", meaning: "nose", anchor: { top: "14%", left: "50%" }, label: { top: "20%", left: "50%" } },
  { id: "mouth", hebrew: "פה", transliteration: "peh", meaning: "mouth", anchor: { top: "17%", left: "50%" }, label: { top: "19%", left: "88%" } },
  { id: "neck", hebrew: "צוואר", transliteration: "tzavar", meaning: "neck", anchor: { top: "22%", left: "50%" }, label: { top: "25%", left: "16%" } },
  { id: "shoulder", hebrew: "כתף", transliteration: "katef", meaning: "shoulder", anchor: { top: "29%", left: "30%" }, label: { top: "29%", left: "84%" } },
  { id: "chest", hebrew: "חזה", transliteration: "chazeh", meaning: "chest", anchor: { top: "34%", left: "50%" }, label: { top: "34%", left: "50%" } },
  { id: "heart", hebrew: "לב", transliteration: "lev", meaning: "heart", anchor: { top: "37%", left: "45%" }, label: { top: "38%", left: "16%" } },
  { id: "back", hebrew: "גב", transliteration: "gav", meaning: "back", anchor: { top: "39%", left: "60%" }, label: { top: "40%", left: "86%" } },
  { id: "arm", hebrew: "יד", transliteration: "yad", meaning: "arm", anchor: { top: "44%", left: "20%" }, label: { top: "46%", left: "9%" } },
  { id: "stomach", hebrew: "בטן", transliteration: "beten", meaning: "stomach", anchor: { top: "48%", left: "50%" }, label: { top: "50%", left: "50%" } },
  { id: "hand", hebrew: "כף יד", transliteration: "kaf yad", meaning: "hand", anchor: { top: "57%", left: "18%" }, label: { top: "59%", left: "8%" } },
  { id: "finger", hebrew: "אצבע", transliteration: "etzba", meaning: "finger", anchor: { top: "62%", left: "17%" }, label: { top: "66%", left: "8%" } },
  { id: "leg", hebrew: "רגל", transliteration: "regel", meaning: "leg", anchor: { top: "75%", left: "44%" }, label: { top: "76%", left: "84%" } },
  { id: "knee", hebrew: "ברך", transliteration: "berech", meaning: "knee", anchor: { top: "83%", left: "44%" }, label: { top: "84%", left: "84%" } },
  { id: "foot", hebrew: "כף רגל", transliteration: "kaf regel", meaning: "foot", anchor: { top: "95%", left: "44%" }, label: { top: "94%", left: "84%" } },
];

export default function BodyPartsLesson() {
  const [clickedParts, setClickedParts] = useState<any>({});
  const [partRatings, setPartRatings] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user for owner-scoped reads/writes
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      return profiles[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return { coins: 0 };
      const coins = await base44.entities.UserCoins.filter({ created_by: currentUser.email });
      return coins[0] || { coins: 0 };
    },
    enabled: !!currentUser?.email,
  });

  const createWordMutation = useMutation({
    mutationFn: (wordData: any) => base44.entities.Word.create(wordData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      const me = currentUser || await base44.auth.me();
      const existing = await base44.entities.LessonProgress.filter({ lesson_name: "BodyPartsLesson", created_by: me.email });
      if (existing.length > 0) {
        return base44.entities.LessonProgress.update(existing[0].id, { completed: true });
      }
      return base44.entities.LessonProgress.create({ lesson_name: "BodyPartsLesson", completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonProgress'] });
      toast.success("Body parts lesson completed! ✓");
    },
    onError: (e: any) => { console.error("BodyPartsLesson completeLessonMutation", e); toast.error("Couldn't save lesson progress"); }
  });

  const handlePartClick = (part: any) => {
    setClickedParts((prev: any) => ({
      ...prev,
      [part.id]: !prev[part.id]
    }));
  };

  const handleRating = async (part: any, rating: number) => {
    setPartRatings((prev: any) => ({ ...prev, [part.id]: rating }));

    await createWordMutation.mutateAsync({
      word: part.hebrew,
      translation: part.meaning,
      phonetic: part.transliteration,
      category: "wordbank",
      times_practiced: rating,
      mastered: rating >= 5,
    });

    toast.success(`Saved "${part.meaning}" with rating ${rating}!`);

    const newRatings = { ...partRatings, [part.id]: rating };
    if (Object.keys(newRatings).length === bodyParts.length) {
      completeLessonMutation.mutate();
    }
  };

  const ratedCount = Object.keys(partRatings).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#2e1065_0%,_#0f0a2e_45%,_#020617_100%)]">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/portal/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
              Body Parts
            </h1>
            <p className="text-white/50 text-sm">Tap a word to reveal the Hebrew • Rate 1–5 to save it</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
          <div className="flex justify-between text-white/70 text-sm mb-2 font-medium">
            <span>{ratedCount} of {bodyParts.length} rated</span>
            {ratedCount === bodyParts.length ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Complete!
              </span>
            ) : (
              <span className="text-white/40">{Math.round((ratedCount / bodyParts.length) * 100)}%</span>
            )}
          </div>
          <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${(ratedCount / bodyParts.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            />
          </div>
        </div>

        {/* Body Diagram */}
        <div className="relative w-full max-w-md mx-auto aspect-[1/2] bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-[2.5rem] border border-white/10 shadow-[0_0_60px_-15px_rgba(56,189,248,0.35)] overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(56,189,248,0.18),_transparent_60%)]" />

          {/* Body silhouette */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 100 200" className="h-full w-auto">
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0.28" />
                </linearGradient>
              </defs>
              <g fill="url(#bodyGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6">
                <circle cx="50" cy="16" r="13" />
                <rect x="46" y="27" width="8" height="9" rx="2" />
                <path d="M30 38 Q50 28 70 38 Q76 65 68 92 Q50 100 32 92 Q24 65 30 38 Z" />
                <rect x="14" y="40" width="9" height="42" rx="4.5" transform="rotate(-6 18.5 61)" />
                <rect x="77" y="40" width="9" height="42" rx="4.5" transform="rotate(6 81.5 61)" />
                <circle cx="17" cy="86" r="5.5" />
                <circle cx="83" cy="86" r="5.5" />
                <rect x="35" y="98" width="13" height="52" rx="6" />
                <rect x="52" y="98" width="13" height="52" rx="6" />
                <ellipse cx="41" cy="156" rx="8.5" ry="5" />
                <ellipse cx="59" cy="156" rx="8.5" ry="5" />
              </g>
            </svg>
          </div>

          {/* Leader lines + anchor dots */}
          <svg className="absolute inset-0 w-full h-full z-[5]" viewBox="0 0 100 100" preserveAspectRatio="none">
            {bodyParts.map((part) => {
              const isClicked = clickedParts[part.id];
              const isRated = partRatings[part.id] !== undefined;
              const color = isClicked ? "#22d3ee" : isRated ? "#34d399" : "rgba(255,255,255,0.35)";
              const ax = parseFloat(part.anchor.left);
              const ay = parseFloat(part.anchor.top);
              const lx = parseFloat(part.label.left);
              const ly = parseFloat(part.label.top);
              return (
                <g key={part.id}>
                  <line
                    x1={ax} y1={ay} x2={lx} y2={ly}
                    stroke={color}
                    strokeWidth={0.4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={ax} cy={ay} r={1.1} fill={color} />
                </g>
              );
            })}
          </svg>

          {/* Clickable body parts */}
          {bodyParts.map((part) => {
            const isClicked = clickedParts[part.id];
            const isRated = partRatings[part.id] !== undefined;
            const rating = partRatings[part.id];

            return (
              <div
                key={part.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ top: part.label.top, left: part.label.left }}
              >
                <motion.button
                  onClick={() => handlePartClick(part)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className={`relative px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border transition-all ${
                    isClicked
                      ? "bg-cyan-400 text-slate-900 border-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.7)]"
                      : isRated
                        ? "bg-emerald-500/90 text-white border-emerald-300/60 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        : "bg-white/10 text-white border-white/15 backdrop-blur-sm hover:bg-white/20 hover:border-white/30"
                  }`}
                >
                  {isClicked ? (
                    <span dir="rtl">{part.hebrew}</span>
                  ) : (
                    <span className="capitalize">{part.meaning}</span>
                  )}
                  {isRated && !isClicked && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-extrabold flex items-center justify-center ring-2 ring-slate-900/60">
                      {rating}
                    </span>
                  )}
                </motion.button>

                {/* Rating popup */}
                {isClicked && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900/95 rounded-xl p-2.5 shadow-2xl border border-cyan-400/30 z-20 whitespace-nowrap backdrop-blur-md"
                  >
                    <p className="text-cyan-300/80 text-[10px] mb-1.5 text-center font-medium italic">{part.transliteration}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={(e) => { e.stopPropagation(); handleRating(part, num); }}
                          className={`w-6 h-6 rounded-lg text-xs font-bold transition-all ${
                            rating === num
                              ? num === 5 ? "bg-emerald-400 text-slate-900" : "bg-cyan-400 text-slate-900"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="text-center text-white/40 text-sm mt-4">
          Tap an English word to reveal its Hebrew translation • Rate it to save to your Backpack
        </p>
      </div>

      <QuickAddWordWidget />
    </div>
  );
}
