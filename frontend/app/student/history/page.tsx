"use client";

import Link from "next/link";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useApiResource } from "@/lib/useApiResource";
import { StatusPill } from "@/components/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <AppShell title="Session History">
      <div className="flex max-w-[900px] flex-col gap-4.5">
        <Link
          href="/student"
          className="flex w-fit items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:text-[#6d2a5f]"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          My Room
        </Link>

        <p className="max-w-[60ch] text-[14px] leading-[1.6] text-muted-foreground">
          A read-only record of every room you&apos;ve been allocated, across
          every session. These entries can&apos;t be edited or removed — by
          design.
        </p>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && history?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You have no past room allocations yet.
          </p>
        )}

        {history && history.length > 0 && (
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(44,16,41,.03)]">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Session
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Hall / Room
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Allocated
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((allocation) => (
                  <TableRow key={allocation.id} className="hover:bg-[#f7f1e8]">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">
                          {allocation.session_name}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {allocation.session_status} session
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {allocation.hall_name} · Room {allocation.room_number}
                      {allocation.corner_label
                        ? ` ${allocation.corner_label}`
                        : ""}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-[#5f5560]">
                      {new Date(allocation.allocated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        kind={
                          allocation.status === "active" ? "current" : "vacated"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function StudentHistoryPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <HistoryContent />
    </RoleGuard>
  );
}
