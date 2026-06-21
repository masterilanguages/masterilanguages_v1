"use client";

import { useCompany } from "@/lib/useCompany";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PlusIcon } from "@/components/Icons";
import { formatDate } from "@/lib/utils";
import type { ColumnDef, Task } from "@/lib/types";

export default function TasksPage() {
  const company = useCompany();
  const tasks = company.data.tasks;

  const columns: ColumnDef<Task>[] = [
    {
      key: "title",
      header: "Task",
      render: (task) => (
        <div>
          <p className="font-medium text-slate-900">{task.title}</p>
          <p className="text-xs text-slate-500">{task.related}</p>
        </div>
      ),
      className: "max-w-[340px] whitespace-normal",
    },
    { key: "assignee", header: "Assignee" },
    { key: "dueDate", header: "Due", render: (task) => formatDate(task.dueDate) },
    {
      key: "priority",
      header: "Priority",
      render: (task) => <StatusBadge status={task.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (task) => <StatusBadge status={task.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={company.labels.tasks}
        description={`What needs to get done at ${company.name}.`}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <PlusIcon /> New task
          </button>
        }
      />
      <DataTable
        columns={columns}
        rows={tasks}
        searchKeys={["title", "assignee", "related"]}
        searchPlaceholder="Search tasks..."
        filters={[
          {
            key: "status",
            label: "Statuses",
            options: ["To Do", "In Progress", "Done", "Blocked"],
          },
          { key: "priority", label: "Priorities", options: ["Low", "Medium", "High"] },
        ]}
      />
    </div>
  );
}
