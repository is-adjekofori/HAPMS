"use client";

import { useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

type HallType = "regular" | "tetfund_danjuma" | "hall_6" | "hall_7";

const HALL_TYPE_OPTIONS: { value: HallType; label: string }[] = [
  { value: "regular", label: "Regular (Halls 1–4)" },
  { value: "tetfund_danjuma", label: "TETFUND A–D / Daisy Danjuma" },
  { value: "hall_6", label: "Hall 6" },
  { value: "hall_7", label: "Hall 7" },
];

interface Hall {
  id: number;
  name: string;
  hall_type: HallType;
  category: string;
  created_at: string;
}

function HallsPageContent() {
  const {
    data: halls,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<Hall[]>("/admin/halls");

  const [name, setName] = useState("");
  const [hallType, setHallType] = useState<HallType>("regular");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch<Hall>("/admin/halls", {
        method: "POST",
        body: { name, hall_type: hallType },
      });
      setName("");
      setHallType("regular");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Halls
          </h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {loadError}
            </p>
          )}
          {!loading && !loadError && halls?.length === 0 && (
            <p className="text-sm text-zinc-500">No halls yet.</p>
          )}
          {halls && halls.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Hall Type</th>
                  <th className="py-2 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {halls.map((hall) => (
                  <tr
                    key={hall.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {hall.name}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {hall.hall_type}
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">
                      {hall.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={handleCreate}
          className="h-fit space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Add a hall
          </h2>

          <div className="space-y-1">
            <label
              htmlFor="name"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hall 3"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="hall_type"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Hall type
            </label>
            <select
              id="hall_type"
              value={hallType}
              onChange={(e) => setHallType(e.target.value as HallType)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {HALL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Adding…" : "Add hall"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function AdminHallsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <HallsPageContent />
    </RoleGuard>
  );
}
