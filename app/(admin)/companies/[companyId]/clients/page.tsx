"use client";

import { useCompany } from "@/lib/useCompany";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PlusIcon } from "@/components/Icons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, ColumnDef } from "@/lib/types";

export default function ClientsPage() {
  const company = useCompany();
  const clients = company.data.clients;
  const singular = company.labels.clients.replace(/s$/, "").toLowerCase();

  const columns: ColumnDef<Client>[] = [
    {
      key: "name",
      header: company.labels.clients.replace(/s$/, ""),
      render: (client) => (
        <div>
          <p className="font-medium text-slate-900">{client.name}</p>
          <p className="text-xs text-slate-500">{client.email}</p>
        </div>
      ),
    },
    ...(company.clientMetaColumns ?? []).map<ColumnDef<Client>>((meta) => ({
      key: meta.key,
      header: meta.header,
      render: (client) => client.meta?.[meta.key] ?? "—",
    })),
    { key: "phone", header: "Phone" },
    { key: "since", header: "Since", render: (client) => formatDate(client.since) },
    {
      key: "totalValue",
      header: "Lifetime Value",
      render: (client) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(client.totalValue, company.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (client) => <StatusBadge status={client.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={company.labels.clients}
        description={`Everyone ${company.name} currently works with.`}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <PlusIcon /> Add {singular}
          </button>
        }
      />
      <DataTable
        columns={columns}
        rows={clients}
        searchKeys={["name", "contact", "email", "phone"]}
        searchPlaceholder={`Search ${company.labels.clients.toLowerCase()}...`}
        filters={[
          { key: "status", label: "Statuses", options: ["Active", "Paused", "Churned"] },
        ]}
      />
    </div>
  );
}
