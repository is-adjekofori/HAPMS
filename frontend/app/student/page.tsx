"use client";

import { useEffect, useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

interface RoomOption {
  id: number;
  hall_id: number;
  hall_name: string;
  room_number: string;
  corner_label: string | null;
  capacity: number;
}

interface BaselineItem {
  id: number;
  asset_type_id: number;
  code: string;
  display_name: string;
  sign_off_group: "corner" | "shared";
  quantity: number;
  condition: "good" | "fair" | "damaged";
  notes: string | null;
}

interface StudentRoom {
  room_id: number;
  hall_name: string;
  room_number: string;
  corner_label: string | null;
  has_baseline: boolean;
  baseline_id: number | null;
  corner: BaselineItem[];
  shared: BaselineItem[];
}

type ViewState =
  | { kind: "loading" }
  | { kind: "onboarding" }
  | { kind: "room"; room: StudentRoom }
  | { kind: "error"; message: string };

function roomLabel(room: RoomOption): string {
  const corner = room.corner_label ? ` ${room.corner_label}` : "";
  return `${room.hall_name} — Room ${room.room_number}${corner}`;
}

function OnboardingForm({ onAllocated }: { onAllocated: () => void }) {
  const {
    data: rooms,
    loading,
    error: loadError,
  } = useApiResource<RoomOption[]>("/student/rooms/available");

  const [roomId, setRoomId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch("/student/allocation", {
        method: "POST",
        body: { room_id: Number(roomId) },
      });
      onAllocated();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Welcome — where has Kofa allocated you?
      </h2>
      <p className="mb-5 text-xs text-zinc-500">
        Select the hall and room Kofa assigned you. This links your account to
        that room for the current session.
      </p>

      {loading && <p className="text-sm text-zinc-500">Loading rooms…</p>}
      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {rooms && (
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="room"
            className="mb-1 block text-xs font-medium text-zinc-500"
          >
            Hall / Room
          </label>
          <select
            id="room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="mb-4 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Select your room…</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {roomLabel(room)}
              </option>
            ))}
          </select>

          {submitError && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={!roomId || submitting}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Saving…" : "Confirm my room"}
          </button>
        </form>
      )}
    </div>
  );
}

function ItemGroup({ title, items }: { title: string; items: BaselineItem[] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing recorded here yet.</p>
      ) : (
        <div className="max-w-xl">
          <div className="grid grid-cols-[1fr_60px_90px] gap-3 border-b border-zinc-200 pb-1 text-xs font-medium text-zinc-500 dark:border-zinc-800">
            <span>Asset</span>
            <span>Qty</span>
            <span>Condition</span>
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_60px_90px] items-center gap-3 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
            >
              <span className="text-black dark:text-zinc-50">
                {item.display_name}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.quantity}
              </span>
              <span className="capitalize text-zinc-600 dark:text-zinc-400">
                {item.condition}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyRoom({ room }: { room: StudentRoom }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        My Room — {room.hall_name}, Room {room.room_number}
        {room.corner_label ? ` ${room.corner_label}` : ""}
      </h2>
      {!room.has_baseline ? (
        <p className="mb-5 text-sm text-zinc-500">
          Your room&apos;s baseline has not been recorded by the Porter yet.
          Check back soon.
        </p>
      ) : (
        <p className="mb-5 text-xs text-zinc-500">
          This is what the Porter logged for your room at check-in.
        </p>
      )}
      <ItemGroup title="My Corner" items={room.corner} />
      <ItemGroup title="Shared Room Items" items={room.shared} />
    </div>
  );
}

function StudentDashboardContent() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ kind: "loading" });
      try {
        const room = await apiFetch<StudentRoom>("/student/room");
        if (!cancelled) setState({ kind: "room", room });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: "onboarding" });
        } else {
          setState({
            kind: "error",
            message:
              err instanceof ApiError
                ? err.message
                : "Unable to reach the server.",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <DashboardShell title="Student Dashboard">
      {state.kind === "loading" && (
        <p className="text-sm text-zinc-500">Loading…</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      {state.kind === "onboarding" && (
        <OnboardingForm onAllocated={() => setRefreshKey((k) => k + 1)} />
      )}
      {state.kind === "room" && <MyRoom room={state.room} />}
    </DashboardShell>
  );
}

export default function StudentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <StudentDashboardContent />
    </RoleGuard>
  );
}
