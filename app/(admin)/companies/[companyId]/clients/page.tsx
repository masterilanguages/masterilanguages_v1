"use client";

import { useState } from "react";
import { useCompany } from "@/lib/useCompany";
import { useLocalStorage } from "@/lib/useLocalStorage";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import ActionMenu from "@/components/ActionMenu";
import CreateModal from "@/components/CreateModal";
import { PlusIcon } from "@/components/Icons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, ColumnDef } from "@/lib/types";

function EditableValue({
  value,
  currency,
  onChange,
}: {
  value: number;
  currency: "USD" | "ILS";
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        className="w-24 rounded border border-teal-400 px-2 py-0.5 text-sm font-medium text-slate-900 outline-none ring-2 ring-teal-200"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          if (!isNaN(n)) onChange(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group flex items-center gap-1 font-medium text-slate-900 hover:text-teal-700"
      title="Click to edit"
    >
      {formatCurrency(value, currency)}
      <span className="text-[10px] text-slate-300 group-hover:text-teal-400">✎</span>
    </button>
  );
}

function ActivateButton({ name, email }: { name: string; email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async () => {
    setStatus("sending");
    const res = await fetch("/api/admin/send-activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setStatus(res.ok ? "sent" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 3000);
  };

  if (status === "sent") return <span className="text-xs font-medium text-teal-600">✓ Sent</span>;
  if (status === "error") return <span className="text-xs font-medium text-red-500">Failed</span>;

  return (
    <button
      type="button"
      onClick={send}
      disabled={status === "sending"}
      className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
    >
      {status === "sending" ? "Sending…" : "Send activation"}
    </button>
  );
}

export default function ClientsPage() {
  const company = useCompany();
  const [clients, setClients] = useLocalStorage<Client[]>("masteri-clients", company.data.clients);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
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
        <EditableValue
          value={client.totalValue}
          currency={company.currency}
          onChange={(v) =>
            setClients((prev) =>
              prev.map((c) => (c.id === client.id ? { ...c, totalValue: v } : c))
            )
          }
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (client) => <StatusBadge status={client.status} />,
    },
    {
      key: "email",
      header: "",
      render: (client) => (
        <ActivateButton name={client.name} email={client.email} />
      ),
    },
    {
      key: "id",
      header: "",
      render: (client) => (
        <ActionMenu
          items={[
            { label: "View Details", onClick: () => setViewClient(client) },
            { label: "Edit", onClick: () => setEditClient(client) },
            {
              label: "Delete",
              destructive: true,
              onClick: () => setClients((prev) => prev.filter((c) => c.id !== client.id)),
            },
          ]}
        />
      ),
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
            onClick={() => setModalOpen(true)}
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
        showActions={false}
      />
      {modalOpen && (
        <CreateModal
          title={`Add ${singular}`}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
            { name: "status", label: "Status", type: "select", options: ["Active", "Paused", "Inactive"] },
          ]}
          onSubmit={(data) => {
            const newClient: Client = {
              id: Date.now().toString(),
              name: data.name,
              contact: data.name,
              email: data.email ?? "",
              phone: data.phone ?? "",
              since: new Date().toISOString().slice(0, 10),
              totalValue: 0,
              status: (data.status as Client["status"]) ?? "Active",
            };
            setClients((prev) => [newClient, ...prev]);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}

      {editClient && (
        <CreateModal
          title={`Edit ${singular}`}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
            { name: "status", label: "Status", type: "select", options: ["Active", "Paused", "Inactive", "Churned"] },
          ]}
          initialValues={{
            name: editClient.name,
            email: editClient.email,
            phone: editClient.phone,
            status: editClient.status,
          }}
          onSubmit={(data) => {
            setClients((prev) =>
              prev.map((c) =>
                c.id === editClient.id
                  ? { ...c, name: data.name, contact: data.name, email: data.email ?? c.email, phone: data.phone ?? c.phone, status: (data.status as Client["status"]) ?? c.status }
                  : c
              )
            );
          }}
          onClose={() => setEditClient(null)}
        />
      )}

      {viewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setViewClient(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{viewClient.name}</h2>
              <button type="button" onClick={() => setViewClient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ["Email", viewClient.email],
                ["Phone", viewClient.phone],
                ["Status", viewClient.status],
                ["Since", formatDate(viewClient.since)],
                ["Lifetime Value", formatCurrency(viewClient.totalValue, company.currency)],
                ...(company.clientMetaColumns ?? []).map((m) => [m.header, viewClient.meta?.[m.key] ?? "—"]),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => { setViewClient(null); setEditClient(viewClient); }}
              className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
