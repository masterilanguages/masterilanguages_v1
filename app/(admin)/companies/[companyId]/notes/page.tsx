"use client";

import { useMemo, useState } from "react";
import { useCompany } from "@/lib/useCompany";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ActionMenu from "@/components/ActionMenu";
import { PlusIcon, SearchIcon } from "@/components/Icons";
import { cn, formatDate } from "@/lib/utils";
import type { Note } from "@/lib/types";

function NoteCard({ note }: { note: Note }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-white p-4 shadow-card",
        note.pinned ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {note.pinned && <span className="mr-1.5 text-amber-500">★</span>}
          {note.title}
        </h3>
        <ActionMenu />
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{note.body}</p>
      <p className="mt-3 text-xs text-slate-400">
        {note.author} · {formatDate(note.date)}
      </p>
    </div>
  );
}

export default function NotesPage() {
  const company = useCompany();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return company.data.notes;
    return company.data.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q)
    );
  }, [company.data.notes, search]);

  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div>
      <PageHeader
        title="Notes"
        description={`Internal notes and reminders for ${company.name}.`}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <PlusIcon /> New note
          </button>
        }
      />

      <div className="relative mb-5 max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No notes found"
          description="Try a different search term, or create the first note."
        />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pinned
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                All notes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
