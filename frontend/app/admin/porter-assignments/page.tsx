"use client";

import { useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

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
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Unable to reach the server.";
        outcomes.push(`✗ ${label} — ${message}`);
      }
    }
    setResults(outcomes);
    setSelectedRooms(new Set());
    setSubmitting(false);
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />

      <form onSubmit={handleAssign} className="max-w-2xl space-y-5">
        <div className="space-y-1">
          <label
            htmlFor="porter"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Porter
          </label>
          <select
            id="porter"
            value={porterId}
            onChange={(e) => setPorterId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Select a porter…</option>
            {porters.map((porter) => (
              <option key={porter.id} value={porter.id}>
                {porter.full_name} ({porter.email})
              </option>
            ))}
          </select>
          {!usersLoading && porters.length === 0 && (
            <p className="text-xs text-zinc-500">
              No active porters yet — add one on the Users page first.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Rooms ({selectedRooms.size} selected)
          </p>
          {roomsLoading && <p className="text-sm text-zinc-500">Loading…</p>}
          {!roomsLoading && rooms?.length === 0 && (
            <p className="text-sm text-zinc-500">
              No rooms yet — add rooms on the Rooms page first.
            </p>
          )}
          {rooms && rooms.length > 0 && (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              {rooms.map((room) => (
                <label
                  key={room.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={selectedRooms.has(room.id)}
                    onChange={() => toggleRoom(room.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {roomLabel(room, hallsById)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}

        {results && (
          <div className="space-y-1 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Assignment results
            </p>
            {results.map((line, i) => (
              <p
                key={i}
                className={
                  line.startsWith("✓")
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {line}
              </p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Assigning…" : "Assign rooms"}
        </button>
      </form>
    </DashboardShell>
  );
}

export default function AdminPorterAssignmentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <PorterAssignmentsContent />
    </RoleGuard>
  );
}
