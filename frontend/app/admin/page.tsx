"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useApiResource } from "@/lib/useApiResource";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummary {
  total_rooms: number;
  total_flagged_issues: number;
  pending_signoff_count: number;
}

const LOOP_STEPS = [
  "Admin opens",
  "Porter baselines",
  "Student signs off",
  "Porter verifies",
];

function DashboardContent() {
  const {
    data: summary,
    loading,
    error,
  } = useApiResource<DashboardSummary>("/admin/dashboard/summary");

  const stats = summary
    ? [
        {
          label: "Rooms on record",
          value: summary.total_rooms,
          sub: "Every room configured in the system",
          valueClass: "text-foreground",
        },
        {
          label: "Flagged this session",
          value: summary.total_flagged_issues,
          sub: "Asset discrepancies to resolve",
          valueClass:
            summary.total_flagged_issues > 0
              ? "text-destructive"
              : "text-foreground",
        },
        {
          label: "Awaiting sign-off",
          value: summary.pending_signoff_count,
          sub: "Occupants yet to confirm",
          valueClass: "text-foreground",
        },
      ]
    : [];

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col">
        <div className="flex items-end justify-between gap-6 border-b border-[#ded3c2] pb-5">
          <div className="flex flex-col gap-3">
            <div className="h-0.5 w-8 bg-[#c99a3f]" />
            <span className="text-[11px] font-semibold tracking-[.16em] text-muted-foreground uppercase">
              At a glance
            </span>
          </div>
        </div>

        {loading && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}
        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {summary && (
          <>
            <div className="mt-6 grid rounded-[10px] border border-border bg-secondary sm:grid-cols-3">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col gap-2.5 p-6 ${
                    i > 0
                      ? "border-t border-border sm:border-t-0 sm:border-l"
                      : ""
                  }`}
                >
                  <span className="text-[11px] font-semibold tracking-[.13em] text-muted-foreground uppercase">
                    {s.label}
                  </span>
                  <span
                    className={`font-heading text-[56px] leading-[.95] font-medium tracking-tight ${s.valueClass}`}
                  >
                    {s.value}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-muted-foreground">
                    {s.sub}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4.5 border-t border-[#ded3c2] pt-5">
              <span className="shrink-0 text-[11px] font-semibold tracking-[.16em] text-muted-foreground uppercase">
                The session loop
              </span>
              <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-3.5">
                {LOOP_STEPS.map((label, i) => (
                  <span key={label} className="flex items-baseline gap-2">
                    <span
                      className={`font-mono text-xs font-medium ${i === 0 ? "text-primary" : "text-[#b7aab2]"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[13px] font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {label}
                    </span>
                    {i < LOOP_STEPS.length - 1 && (
                      <span className="ml-1 text-xs text-[#cabfc4]">/</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardContent />
    </RoleGuard>
  );
}
