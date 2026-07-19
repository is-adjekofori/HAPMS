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
  hall_type: string;
  category: string;
  created_at: string;
}

interface Room {
  id: number;
  hall_id: number;
  room_number: string;
  corner_label: string | null;
  capacity: number;
  created_at: string;
}

function RoomsPageContent() {
  const { data: halls } = useApiResource<Hall[]>("/admin/halls");
  const {
    data: rooms,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<Room[]>("/admin/rooms");

  const [hallId, setHallId] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState("");
  const [cornerLabel, setCornerLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hallsById = new Map((halls ?? []).map((hall) => [hall.id, hall]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!hallId) {
      setFormError("Choose a hall first.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch<Room>("/admin/rooms", {
        method: "POST",
        body: {
          hall_id: Number(hallId),
          room_number: roomNumber,
          corner_label: cornerLabel.trim() === "" ? null : cornerLabel.trim(),
        },
      });
      setRoomNumber("");
      setCornerLabel("");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Rooms
          </h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {loadError}
            </p>
          )}
          {!loading && !loadError && rooms?.length === 0 && (
            <p className="text-sm text-zinc-500">No rooms yet.</p>
          )}
          {rooms && rooms.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Hall</th>
                  <th className="py-2 pr-4 font-medium">Room</th>
                  <th className="py-2 pr-4 font-medium">Corner</th>
                  <th className="py-2 font-medium">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {hallsById.get(room.hall_id)?.name ?? `#${room.hall_id}`}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {room.room_number}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {room.corner_label ?? "—"}
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">
                      {room.capacity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={handleCreate}
          className="h-fit space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Add a room
          </h2>

          <div className="space-y-1">
            <label
              htmlFor="hall"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Hall
            </label>
            <select
              id="hall"
              value={hallId}
              onChange={(e) => setHallId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select a hall…</option>
              {(halls ?? []).map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {hall.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="room_number"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Room number
            </label>
            <input
              id="room_number"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="corner_label"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Corner label (Hall 7 only)
            </label>
            <input
              id="corner_label"
              value={cornerLabel}
              onChange={(e) => setCornerLabel(e.target.value)}
              placeholder="e.g. A"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Adding…" : "Add room"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function AdminRoomsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <RoomsPageContent />
    </RoleGuard>
  );
}
