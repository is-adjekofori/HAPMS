"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { useApiResource } from "@/lib/useApiResource";

interface BaselineReportItem {
  baseline_id: number;
  room_id: number;
  hall_name: string;
  room_number: string;
  session_id: number;
  session_name: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  shared_confirmed: boolean;
}

interface VerificationReportItem {
  verification_id: number;
  baseline_id: number;
  room_id: number;
  hall_name: string;
  room_number: string;
  session_id: number;
  session_name: string;
  flagged_count: number;
  verified_at: string;
}

function BaselinesTable() {
  const {
    data: rows,
    loading,
    error,
  } = useApiResource<BaselineReportItem[]>("/admin/reports/baselines");

  return (
    <div className="mb-10">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Baselines
      </h2>
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!loading && !error && rows?.length === 0 && (
        <p className="text-sm text-zinc-500">No baselines recorded yet.</p>
      )}
      {rows && rows.length > 0 && (
        <table className="w-full max-w-3xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">Room</th>
              <th className="py-2 pr-4 font-medium">Session</th>
              <th className="py-2 pr-4 font-medium">Recorded by</th>
              <th className="py-2 pr-4 font-medium">Created</th>
              <th className="py-2 font-medium">Shared confirmed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.baseline_id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-4 text-black dark:text-zinc-50">
                  {row.hall_name}, Room {row.room_number}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {row.session_name}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {row.created_by_name}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="py-2">
                  {row.shared_confirmed ? (
                    <span className="text-green-700 dark:text-green-400">
                      Yes
                    </span>
                  ) : (
                    <span className="text-zinc-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function VerificationsTable() {
  const {
    data: rows,
    loading,
    error,
  } = useApiResource<VerificationReportItem[]>("/admin/reports/verifications");

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Verifications
      </h2>
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!loading && !error && rows?.length === 0 && (
        <p className="text-sm text-zinc-500">No verifications recorded yet.</p>
      )}
      {rows && rows.length > 0 && (
        <table className="w-full max-w-3xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">Room</th>
              <th className="py-2 pr-4 font-medium">Session</th>
              <th className="py-2 pr-4 font-medium">Flagged items</th>
              <th className="py-2 font-medium">Verified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.verification_id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-4 text-black dark:text-zinc-50">
                  {row.hall_name}, Room {row.room_number}
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {row.session_name}
                </td>
                <td
                  className={
                    row.flagged_count > 0
                      ? "py-2 pr-4 text-amber-600 dark:text-amber-400"
                      : "py-2 pr-4 text-green-700 dark:text-green-400"
                  }
                >
                  {row.flagged_count}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {new Date(row.verified_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportsContent() {
  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />
      <BaselinesTable />
      <VerificationsTable />
    </DashboardShell>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
