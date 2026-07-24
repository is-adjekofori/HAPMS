"use client";

import Link from "next/link";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { useApiResource } from "@/lib/useApiResource";

interface HistoryAllocation {
  id: number;
  session_id: number;
  session_name: string;
  session_status: "active" | "closed";
  hall_name: string;
  room_number: string;
  corner_label: string | null;
  allocated_at: string;
  status: "active" | "vacated";
}

function HistoryContent() {
  const {
    data: history,
    loading,
    error,
  } = useApiResource<HistoryAllocation[]>("/student/history");

  return (
    <DashboardShell title="Student Dashboard">
      <div className="mb-4">
        <Link
          href="/student"
          className="text-sm text-zinc-500 underline hover:text-black dark:hover:text-zinc-50"
        >
          ← My Room
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        My Session History
      </h2>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!loading && !error && history?.length === 0 && (
        <p className="text-sm text-zinc-500">
          You have no past room allocations yet.
        </p>
      )}

      {history && history.length > 0 && (
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">Session</th>
              <th className="py-2 pr-4 font-medium">Hall / Room</th>
              <th className="py-2 pr-4 font-medium">Allocated</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((allocation) => (
              <tr
                key={allocation.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-4 text-black dark:text-zinc-50">
                  {allocation.session_name}
                  <span className="ml-1 text-xs text-zinc-400 capitalize">
                    ({allocation.session_status})
                  </span>
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {allocation.hall_name}, Room {allocation.room_number}
                  {allocation.corner_label ? ` ${allocation.corner_label}` : ""}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {new Date(allocation.allocated_at).toLocaleDateString()}
                </td>
                <td className="py-2 capitalize text-zinc-600 dark:text-zinc-400">
                  {allocation.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardShell>
  );
}

export default function StudentHistoryPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <HistoryContent />
    </RoleGuard>
  );
}
