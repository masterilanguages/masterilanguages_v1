"use client";

import { useCompany } from "@/lib/useCompany";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PlusIcon } from "@/components/Icons";
import { formatDate } from "@/lib/utils";
import { masteriLessons } from "@/lib/mock/masteri";
import type { ColumnDef, Company, MasteriLesson } from "@/lib/types";

function MasteriLessonsTable() {
  const columns: ColumnDef<MasteriLesson>[] = [
    {
      key: "student",
      header: "Student",
      render: (l) => <span className="font-medium text-slate-900">{l.student}</span>,
    },
    { key: "coach", header: "Coach" },
    { key: "language", header: "Language" },
    { key: "level", header: "Level" },
    {
      key: "date",
      header: "When",
      render: (l) => `${formatDate(l.date)} · ${l.time}`,
    },
    { key: "topic", header: "Topic", className: "max-w-[260px] truncate" },
    { key: "status", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={masteriLessons}
      searchKeys={["student", "coach", "language", "topic"]}
      searchPlaceholder="Search lessons..."
      filters={[
        {
          key: "status",
          label: "Statuses",
          options: ["Scheduled", "Completed", "Cancelled", "No-Show"],
        },
        {
          key: "language",
          label: "Languages",
          options: ["Hebrew", "Spanish", "German"],
        },
      ]}
    />
  );
}


export default function ProjectsPage() {
  const company = useCompany();
  return (
    <div>
      <PageHeader title={company.labels.projects} description="Scheduled and past coaching sessions." actions={<button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"><PlusIcon /> New lesson</button>} />
      <MasteriLessonsTable />
    </div>
  );
}
