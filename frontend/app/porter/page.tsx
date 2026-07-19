"use client";

import Link from "next/link";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { useApiResource } from "@/lib/useApiResource";

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
}

function baselineStatus(room: PorterRoom): {
  label: string;
  className: string;
} {
  if (!room.has_baseline)
    return {
      label: "Not recorded",
      className: "text-amber-600 dark:text-amber-400",
    };
  if (room.baseline_locked)
    return { label: "Locked", className: "text-zinc-400" };
  return { label: "Recorded", className: "text-green-700 dark:text-green-400" };
}

function MyRoomsContent() {
  const {
    data: rooms,
    loading,
    error,
  } = useApiResource<PorterRoom[]>("/porter/rooms");

  return (
    <DashboardShell title="Porter Dashboard">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        My Assigned Rooms
      </h2>
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!loading && !error && rooms?.length === 0 && (
        <p className="text-sm text-zinc-500">
          You have no rooms assigned yet. Ask the Administrator to assign you
          rooms.
        </p>
      )}
      {rooms && rooms.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">Hall</th>
              <th className="py-2 pr-4 font-medium">Room</th>
              <th className="py-2 pr-4 font-medium">Corner</th>
              <th className="py-2 pr-4 font-medium">Capacity</th>
              <th className="py-2 pr-4 font-medium">Baseline</th>
              <th className="py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const status = baselineStatus(room);
              return (
                <tr
                  key={room.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 text-black dark:text-zinc-50">
                    {room.hall_name}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                    {room.room_number}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                    {room.corner_label ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                    {room.capacity}
                  </td>
                  <td className={`py-2 pr-4 ${status.className}`}>
                    {status.label}
                  </td>
                  <td className="py-2">
                    {room.has_baseline ? (
                      <span className="text-xs text-zinc-400">
                        {room.baseline_locked ? "Locked" : "Recorded"}
                      </span>
                    ) : (
                      <Link
                        href={`/porter/rooms/${room.id}/baseline`}
                        className="text-xs font-medium text-black underline dark:text-zinc-50"
                      >
                        Record baseline
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DashboardShell>
  );
}

export default function PorterDashboardPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <MyRoomsContent />
    </RoleGuard>
  );
}
