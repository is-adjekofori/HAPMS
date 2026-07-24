"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { useApiResource } from "@/lib/useApiResource";

interface DashboardSummary {
  total_rooms: number;
  total_flagged_issues: number;
  pending_signoff_count: number;
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-black dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function DashboardContent() {
  const {
    data: summary,
    loading,
    error,
  } = useApiResource<DashboardSummary>("/admin/dashboard/summary");

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {summary && (
        <div className="flex max-w-2xl gap-4">
          <StatTile label="Total rooms" value={summary.total_rooms} />
          <StatTile
            label="Flagged asset problems"
            value={summary.total_flagged_issues}
          />
          <StatTile
            label="Pending sign-offs"
            value={summary.pending_signoff_count}
          />
        </div>
      )}
    </DashboardShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardContent />
    </RoleGuard>
  );
}
