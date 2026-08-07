"use client";

import { useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useApiResource } from "@/lib/useApiResource";
import { StatusPill } from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!rows || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No baselines recorded yet.
      </p>
    );

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(44,16,41,.03)]">
      <Table>
        <TableHeader className="bg-secondary">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Room
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Session
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Recorded by
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Created
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Shared confirmed
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.baseline_id} className="hover:bg-[#f7f1e8]">
              <TableCell className="font-semibold text-foreground">
                {row.hall_name}, Room {row.room_number}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.session_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.created_by_name}
              </TableCell>
              <TableCell className="font-mono text-[13px] text-[#5f5560]">
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <StatusPill
                  kind={row.shared_confirmed ? "confirmed" : "pendingSignoff"}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function VerificationsTable() {
  const {
    data: rows,
    loading,
    error,
  } = useApiResource<VerificationReportItem[]>("/admin/reports/verifications");

  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!rows || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No verifications recorded yet.
      </p>
    );

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(44,16,41,.03)]">
      <Table>
        <TableHeader className="bg-secondary">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Room
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Session
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Flagged items
            </TableHead>
            <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
              Verified
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.verification_id} className="hover:bg-[#f7f1e8]">
              <TableCell className="font-semibold text-foreground">
                {row.hall_name}, Room {row.room_number}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.session_name}
              </TableCell>
              <TableCell>
                <StatusPill
                  kind={row.flagged_count > 0 ? "flagged" : "clean"}
                  label={
                    row.flagged_count > 0
                      ? `${row.flagged_count} flagged`
                      : undefined
                  }
                />
              </TableCell>
              <TableCell className="font-mono text-[13px] text-[#5f5560]">
                {new Date(row.verified_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReportsContent() {
  const [tab, setTab] = useState<"baselines" | "verifications">("baselines");
  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4.5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground"
    }`;

  return (
    <AppShell title="Reports">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Reports
        </h2>
        <p className="mb-3 text-[13px] text-muted-foreground">
          Every baseline and verification recorded across all sessions.
        </p>
        <div className="mb-5 flex gap-0.5 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("baselines")}
            className={tabClass(tab === "baselines")}
          >
            Baselines
          </button>
          <button
            type="button"
            onClick={() => setTab("verifications")}
            className={tabClass(tab === "verifications")}
          >
            Verifications
          </button>
        </div>
        {tab === "baselines" ? <BaselinesTable /> : <VerificationsTable />}
      </div>
    </AppShell>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
