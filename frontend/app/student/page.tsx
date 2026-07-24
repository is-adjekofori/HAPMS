"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

type SignOffStatus = "confirmed" | "contested";
type SignOffGroup = "corner" | "shared";

interface SignOff {
  id: number;
  baseline_id: number;
  sign_off_group: SignOffGroup;
  status: SignOffStatus;
  comment: string | null;
  signed_at: string;
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
  corner_sign_off: SignOff | null;
  shared_sign_off: SignOff | null;
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

function SignOffPanel({
  baselineId,
  group,
  signOff,
  onSigned,
}: {
  baselineId: number;
  group: SignOffGroup;
  signOff: SignOff | null;
  onSigned: () => void;
}) {
  const [disputing, setDisputing] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(status: SignOffStatus) {
    if (status === "contested" && !comment.trim()) {
      setError("Please describe the issue before disputing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/student/signoff", {
        method: "POST",
        body: {
          baseline_id: baselineId,
          sign_off_group: group,
          status,
          comment: comment.trim() || null,
        },
      });
      onSigned();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
      setSubmitting(false);
    }
  }

  if (signOff) {
    return (
      <div className="mb-6 -mt-4 text-sm">
        <span
          className={
            signOff.status === "confirmed"
              ? "text-green-700 dark:text-green-400"
              : "text-amber-600 dark:text-amber-400"
          }
        >
          {signOff.status === "confirmed" ? "Confirmed" : "Disputed"}
        </span>
        {signOff.comment && (
          <p className="mt-1 text-xs text-zinc-500">
            &ldquo;{signOff.comment}&rdquo;
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 -mt-4 max-w-xl">
      {!disputing ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit("confirmed")}
            disabled={submitting}
            className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setDisputing(true)}
            disabled={submitting}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
          >
            Dispute
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describe the issue…"
            rows={2}
            aria-label={`${group} dispute comment`}
            className="mb-2 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("contested")}
              disabled={submitting}
              className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Submit dispute
            </button>
            <button
              type="button"
              onClick={() => {
                setDisputing(false);
                setError(null);
              }}
              className="text-xs text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function ConditionReportForm({
  assetOptions,
}: {
  assetOptions: BaselineItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [assetTypeId, setAssetTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dedupe by asset_type_id: corner + shared items may repeat across renders
  // but each asset type should appear once in the dropdown.
  const uniqueAssets = Array.from(
    new Map(assetOptions.map((item) => [item.asset_type_id, item])).values(),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe what changed.");
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch("/student/condition-report", {
        method: "POST",
        body: {
          description: description.trim(),
          asset_type_id: assetTypeId ? Number(assetTypeId) : null,
        },
      });
      setSuccess(true);
      setDescription("");
      setAssetTypeId("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm font-medium text-black underline dark:text-zinc-50"
      >
        Report a condition change
      </button>
    );
  }

  return (
    <div className="max-w-xl rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Report a condition change
      </h3>
      <p className="mb-3 text-xs text-zinc-500">
        Flag anything that changed during your stay, e.g. &ldquo;the fan stopped
        working in March&rdquo;.
      </p>
      <form onSubmit={handleSubmit}>
        {uniqueAssets.length > 0 && (
          <>
            <label
              htmlFor="asset"
              className="mb-1 block text-xs font-medium text-zinc-500"
            >
              Related item (optional)
            </label>
            <select
              id="asset"
              value={assetTypeId}
              onChange={(e) => setAssetTypeId(e.target.value)}
              className="mb-3 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">General (not tied to a specific item)</option>
              {uniqueAssets.map((item) => (
                <option key={item.asset_type_id} value={item.asset_type_id}>
                  {item.display_name}
                </option>
              ))}
            </select>
          </>
        )}
        <label
          htmlFor="description"
          className="mb-1 block text-xs font-medium text-zinc-500"
        >
          What changed?
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        {success && (
          <p className="mb-3 text-xs text-green-700 dark:text-green-400">
            Report submitted. Thank you.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}

function MyRoom({
  room,
  onSigned,
}: {
  room: StudentRoom;
  onSigned: () => void;
}) {
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
          This is what the Porter logged for your room at check-in. Confirm or
          dispute each grouping independently.
        </p>
      )}
      <ItemGroup title="My Corner" items={room.corner} />
      {room.has_baseline && room.baseline_id !== null && (
        <SignOffPanel
          baselineId={room.baseline_id}
          group="corner"
          signOff={room.corner_sign_off}
          onSigned={onSigned}
        />
      )}
      <ItemGroup title="Shared Room Items" items={room.shared} />
      {room.has_baseline && room.baseline_id !== null && (
        <SignOffPanel
          baselineId={room.baseline_id}
          group="shared"
          signOff={room.shared_sign_off}
          onSigned={onSigned}
        />
      )}
      <div className="mt-2">
        <ConditionReportForm assetOptions={[...room.corner, ...room.shared]} />
      </div>
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
      <div className="mb-4">
        <Link
          href="/student/history"
          className="text-sm text-zinc-500 underline hover:text-black dark:hover:text-zinc-50"
        >
          View my session history →
        </Link>
      </div>
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
      {state.kind === "room" && (
        <MyRoom
          room={state.room}
          onSigned={() => setRefreshKey((k) => k + 1)}
        />
      )}
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
