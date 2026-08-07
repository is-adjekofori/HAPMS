"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Hall {
  id: number;
  name: string;
}

interface Room {
  id: number;
  hall_id: number;
  room_number: string;
  corner_label: string | null;
  capacity: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

function roomLabel(room: Room, hallsById: Map<number, Hall>): string {
  const hall = hallsById.get(room.hall_id)?.name ?? `Hall #${room.hall_id}`;
  const corner = room.corner_label ? ` (${room.corner_label})` : "";
  return `${hall} / ${room.room_number}${corner}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PorterAssignmentsContent() {
  const { data: halls } = useApiResource<Hall[]>("/admin/halls");
  const { data: rooms, loading: roomsLoading } =
    useApiResource<Room[]>("/admin/rooms");
  const { data: users, loading: usersLoading } =
    useApiResource<User[]>("/admin/users");

  const [porterId, setPorterId] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hallsById = new Map((halls ?? []).map((hall) => [hall.id, hall]));
  const porters = (users ?? []).filter(
    (user) => user.role === "porter" && user.is_active,
  );
  const portersById = new Map(porters.map((p) => [String(p.id), p]));
  const selectedPorter = portersById.get(porterId);

  function toggleRoom(roomId: number) {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResults(null);

    if (!porterId) {
      setFormError("Choose a porter first.");
      return;
    }
    if (selectedRooms.size === 0) {
      setFormError("Select at least one room.");
      return;
    }

    setSubmitting(true);
    const roomIds = Array.from(selectedRooms);
    const outcomes: string[] = [];
    let successCount = 0;
    // The API assigns one room at a time; issue them sequentially so each
    // room's success/failure (e.g. a 409 duplicate) is reported individually.
    for (const roomId of roomIds) {
      const room = (rooms ?? []).find((r) => r.id === roomId);
      const label = room ? roomLabel(room, hallsById) : `Room #${roomId}`;
      try {
        await apiFetch("/admin/porter-assignments", {
          method: "POST",
          body: { porter_id: Number(porterId), room_id: roomId },
        });
        outcomes.push(`✓ ${label}`);
        successCount += 1;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Unable to reach the server.";
        outcomes.push(`✗ ${label} — ${message}`);
      }
    }
    setResults(outcomes);
    setSelectedRooms(new Set());
    setSubmitting(false);
    if (successCount > 0) {
      toast.success(
        `Assigned ${successCount} room${successCount === 1 ? "" : "s"} to ${portersById.get(porterId)?.full_name ?? "porter"}`,
      );
    }
  }

  return (
    <AppShell title="Porter Assignments">
      <form
        onSubmit={handleAssign}
        className="flex max-w-[920px] flex-col gap-4.5"
      >
        <div className="grid gap-4.5 md:grid-cols-[1fr_1.15fr]">
          {/* Step 1: choose porter */}
          <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-5.5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[.1em] text-muted-foreground uppercase">
                Step 1
              </span>
              <span className="font-heading text-[19px] font-semibold text-foreground">
                Choose a porter
              </span>
            </div>
            {usersLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!usersLoading && porters.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active porters yet — add one on the Users page first.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {porters.map((porter) => {
                const selected = String(porter.id) === porterId;
                return (
                  <button
                    key={porter.id}
                    type="button"
                    onClick={() => {
                      setPorterId(String(porter.id));
                      setResults(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-[#faf3f8]"
                        : "border-border bg-secondary"
                    }`}
                  >
                    <span
                      className={`flex size-8.5 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-primary"
                      }`}
                    >
                      {initials(porter.full_name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                      <span className="text-sm font-semibold text-foreground">
                        {porter.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {porter.email}
                      </span>
                    </span>
                    {selected && (
                      <Check className="ml-auto size-4.5 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: select rooms */}
          <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-5.5">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-[.1em] text-muted-foreground uppercase">
                  Step 2
                </span>
                <span className="font-heading text-[19px] font-semibold text-foreground">
                  Select rooms
                </span>
              </div>
              <span className="rounded-full border border-[#e0cfdb] bg-accent px-3 py-1 text-[12.5px] font-semibold text-primary">
                {selectedRooms.size} selected
              </span>
            </div>
            {roomsLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!roomsLoading && rooms?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No rooms yet — add rooms on the Rooms page first.
              </p>
            )}
            {rooms && rooms.length > 0 && (
              <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {rooms.map((room) => {
                  const checked = selectedRooms.has(room.id);
                  return (
                    <label
                      key={room.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm transition-colors ${
                        checked ? "bg-[#faf3f8]" : "hover:bg-accent/50"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRoom(room.id)}
                      />
                      <span className="font-medium text-foreground">
                        {roomLabel(room, hallsById)}
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        cap {room.capacity}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-[9px] py-3"
            >
              {submitting
                ? "Assigning…"
                : `Assign ${selectedRooms.size} room${selectedRooms.size === 1 ? "" : "s"}${selectedPorter ? ` to ${selectedPorter.full_name.split(" ")[0]}` : ""}`}
            </Button>
          </div>
        </div>

        {results && (
          <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-5.5">
            <span className="text-[11px] font-semibold tracking-[.1em] text-muted-foreground uppercase">
              Assignment results
            </span>
            {results.map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border-b border-[#efe7db] py-2 text-[13.5px] last:border-0"
              >
                {line.startsWith("✓") ? (
                  <Check className="size-4 shrink-0 text-[#2f7d4f]" />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" />
                )}
                <span
                  className={
                    line.startsWith("✓")
                      ? "text-[#2f7d4f]"
                      : "font-medium text-foreground"
                  }
                >
                  {line.slice(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>
    </AppShell>
  );
}

export default function AdminPorterAssignmentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <PorterAssignmentsContent />
    </RoleGuard>
  );
}
