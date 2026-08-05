"use client";

import { AlertTriangle, DoorOpen, UserCheck } from "lucide-react";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { useApiResource } from "@/lib/useApiResource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummary {
  total_rooms: number;
  total_flagged_issues: number;
  pending_signoff_count: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "neutral" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon
          className={
            tone === "warning" && value > 0
              ? "size-4 text-amber-500"
              : "size-4 text-muted-foreground"
          }
        />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const {
    data: summary,
    loading,
    error,
  } = useApiResource<DashboardSummary>("/admin/dashboard/summary");

  return (
    <AdminShell title="Dashboard">
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total rooms"
            value={summary.total_rooms}
            icon={DoorOpen}
            tone="neutral"
          />
          <StatCard
            label="Flagged asset problems"
            value={summary.total_flagged_issues}
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            label="Pending sign-offs"
            value={summary.pending_signoff_count}
            icon={UserCheck}
            tone="warning"
          />
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardContent />
    </RoleGuard>
  );
}
