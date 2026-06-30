"use client";

import { useState, useEffect, useRef } from "react";
import { base44 as base44Client } from "@/api/base44Client";
const base44: any = base44Client;
import { useQueryClient } from "@tanstack/react-query";

const LANGUAGES = [
  { id: "hebrew",     name: "Hebrew",     emoji: "🇮🇱" },
  { id: "english",    name: "English",    emoji: "🇺🇸" },
  { id: "spanish",    name: "Spanish",    emoji: "🇪🇸" },
];

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(async (user: any) => {
        setUserEmail(user.email);
        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        if (profiles[0]) {
          setCurrentLang(profiles[0].language || "hebrew");
          setProfileId(profiles[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (langId: string) => {
    if (langId === currentLang || saving || !profileId) return;
    setSaving(true);
    setOpen(false);
    try {
      await base44.entities.UserProfile.update(profileId, { language: langId });
      setCurrentLang(langId);
      await queryClient.invalidateQueries({ queryKey: ["userProfile", userEmail] });
    } catch {
      // silently ignore — next page load will re-fetch the profile
    }
    setSaving(false);
  };

  const active = LANGUAGES.find((l) => l.id === currentLang);
  if (!active) return null;

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100 disabled:opacity-50"
      >
        <span className="text-base">{active.emoji}</span>
        <span>{active.name}</span>
        <span className="ml-auto text-slate-600 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleSelect(lang.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                lang.id === currentLang
                  ? "text-teal-400 font-semibold"
                  : "text-slate-300"
              }`}
            >
              <span>{lang.emoji}</span>
              <span>{lang.name}</span>
              {lang.id === currentLang && <span className="ml-auto text-teal-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
