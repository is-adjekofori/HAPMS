"use client";

import Link from "next/link";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useApiResource } from "@/lib/useApiResource";
import { StatusPill } from "@/components/StatusPill";
import type { PillKind } from "@/lib/pill";

interface PorterRoom {
  id: number;
  hall_id: number;
  hall_name: string;
  room_number: string;
  corner_label: string | null;
  capacity: number;
  has_baseline: boolean;
  baseline_id: number | null;
  baseline_locked: boolean;
  shared_confirmed: boolean;
  no_baseline_yet: boolean;
  pending_verification: boolean;
}

function statusKind(room: PorterRoom): PillKind {
  if (room.no_baseline_yet) return "notRecorded";
  if (room.pending_verification) return "pendingVerification";
  if (room.baseline_locked) return "locked";
  return "recorded";
}

function MyRoomsContent() {
  const {
    data: rooms,
    loading,
    error,
  } = useApiResource<PorterRoom[]>("/porter/rooms");

  return (
    <AppShell title="My Assigned Rooms">
      <div className="flex flex-col gap-5">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && rooms?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You have no rooms assigned yet. Ask the Administrator to assign you
            rooms.
          </p>
        )}

        {rooms && rooms.length > 0 && (
          <>
            <div className="flex flex-wrap items-baseline gap-3 border-b border-[#ded3c2] pb-4.5">
              <span className="font-heading text-xl font-medium text-foreground">
                {rooms.length} room{rooms.length === 1 ? "" : "s"} assigned to
                you
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map((room) => {
                const kind = statusKind(room);
                const canRecord = !room.has_baseline;
                const canVerify = room.has_baseline && !room.baseline_locked;
                return (
                  <div
                    key={room.id}
                    className="flex flex-col gap-4 rounded-[13px] border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-heading text-xl font-semibold text-foreground">
                          {room.hall_name} · Room {room.room_number}
                          {room.corner_label ? ` ${room.corner_label}` : ""}
                        </span>
                        <span className="font-mono text-[12.5px] text-muted-foreground">
                          Capacity {room.capacity}
                          {room.corner_label
                            ? ` · Corner ${room.corner_label}`
                            : ""}
                        </span>
                      </div>
                      <StatusPill kind={kind} />
                    </div>

                    {canRecord && (
                      <Link
                        href={`/porter/rooms/${room.id}/baseline`}
                        className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#6d2a5f]"
                      >
                        Record baseline
                        <svg
                          viewBox="0 0 24 24"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    )}
                    {!canRecord && canVerify && (
                      <Link
                        href={`/porter/rooms/${room.id}/verify`}
                        className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#6d2a5f]"
                      >
                        Verify &amp; lock
                        <svg
                          viewBox="0 0 24 24"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    )}
                    {!canRecord && !canVerify && (
                      <div className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-border bg-[#f2ede4] py-2.5 text-[13px] font-semibold text-muted-foreground">
                        <svg
                          viewBox="0 0 24 24"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 11V7a5 5 0 0 1 10 0M4 11h12v9H4z" />
                        </svg>
                        Verified &amp; locked — no action needed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function PorterDashboardPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <MyRoomsContent />
    </RoleGuard>
  );
}
