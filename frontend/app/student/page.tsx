"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  pending: boolean;
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

function conditionColor(condition: string): string {
  if (condition === "damaged") return "#b8600a";
  if (condition === "fair") return "#8a5a12";
  return "#2f7d4f";
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
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Welcome — where has Kofa allocated you?
      </h2>
      <p className="mt-1.5 mb-5 text-[13.5px] text-muted-foreground">
        Select the hall and room Kofa assigned you. This links your account to
        that room for the current session.
      </p>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading rooms…</p>
      )}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {rooms && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="room"
              className="text-xs font-semibold tracking-[.06em] text-[#6b5f67] uppercase"
            >
              Hall / Room
            </label>
            <Select value={roomId} onValueChange={(v) => setRoomId(v ?? "")}>
              <SelectTrigger id="room" className="w-full">
                <SelectValue placeholder="Select your room…">
                  {(value: string) => {
                    const r = rooms.find((room) => String(room.id) === value);
                    return r ? roomLabel(r) : "Select your room…";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={String(room.id)}>
                    {roomLabel(room)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <Button
            type="submit"
            disabled={!roomId || submitting}
            className="w-fit rounded-[9px] py-2.5"
          >
            {submitting ? "Saving…" : "Confirm my room"}
          </Button>
        </form>
      )}
    </div>
  );
}

function SignOffPanel({
  baselineId,
  group,
  title,
  items,
  signOff,
  onSigned,
}: {
  baselineId: number;
  group: SignOffGroup;
  title: string;
  items: BaselineItem[];
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

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2.5 border-b border-[#efe7db] px-4.5 py-4">
        <span className="font-heading text-lg font-semibold text-foreground">
          {title}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-col">
        {items.length === 0 ? (
          <p className="px-4.5 py-4 text-sm text-muted-foreground">
            Nothing recorded here yet.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-[#f3ecdf] px-4.5 py-2.5 last:border-0"
            >
              <span className="text-sm text-[#3f3540]">
                {item.display_name}
              </span>
              <span className="flex items-center gap-3.5">
                <span className="font-mono text-[13px] text-muted-foreground">
                  ×{item.quantity}
                </span>
                <span
                  className="text-[12.5px] font-semibold capitalize"
                  style={{ color: conditionColor(item.condition) }}
                >
                  {item.condition}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-col gap-3 p-4.5">
        {signOff ? (
          signOff.status === "confirmed" ? (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-[#c2ddc9] bg-[#e6f1e8] px-3.5 py-3">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="#2f7d4f"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
              </svg>
              <span className="text-[13.5px] font-semibold text-[#2f7d4f]">
                Confirmed — this is final and can&apos;t be changed.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#f0d3a8] bg-[#fbeed9] px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#8a5a12]">
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 8v4M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
                Disputed — recorded to the audit trail.
              </span>
              {signOff.comment && (
                <span className="border-l-[3px] border-[#e6c78e] pl-2.5 text-[13px] leading-[1.5] text-[#6b5f67] italic">
                  &ldquo;{signOff.comment}&rdquo;
                </span>
              )}
            </div>
          )
        ) : !disputing ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => submit("confirmed")}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-[9px] bg-primary py-3 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#6d2a5f] disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setDisputing(true)}
              disabled={submitting}
              className="flex-1 rounded-[9px] border border-[#ddd3c4] bg-secondary py-3 text-[13.5px] font-semibold text-[#8a5a12] transition-colors hover:border-[#f0d3a8] hover:bg-[#fbeed9] disabled:opacity-50"
            >
              Dispute
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the issue…"
              rows={3}
              aria-label={`${group} dispute comment`}
              className="w-full resize-y rounded-[9px] border border-[#d8cebf] bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDisputing(false);
                  setError(null);
                }}
                className="rounded-[9px] border border-[#ddd3c4] bg-secondary px-4.5 py-2.5 text-[13.5px] font-semibold text-[#5f5560]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submit("contested")}
                disabled={submitting || !comment.trim()}
                className="rounded-[9px] bg-primary px-4.5 py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-[#6d2a5f] disabled:cursor-not-allowed disabled:bg-[#d8cebf] disabled:text-[#a99a8c]"
              >
                Submit dispute
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
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
        className="flex w-fit items-center gap-2 text-[13.5px] font-semibold text-primary hover:text-[#6d2a5f]"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Report a condition change during your stay
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[12px] border border-border bg-secondary p-4.5">
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-heading text-[17px] font-semibold text-foreground">
          Report a condition change
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground hover:text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {success && (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-[#c2ddc9] bg-[#e6f1e8] px-3.5 py-3">
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="#2f7d4f"
            strokeWidth="2"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-[13.5px] font-semibold text-[#2f7d4f]">
            Report submitted. Thank you.
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {uniqueAssets.length > 0 && (
          <Select
            value={assetTypeId}
            onValueChange={(v) => setAssetTypeId(v ?? "")}
          >
            <SelectTrigger aria-label="Related item" className="w-full">
              <SelectValue placeholder="General (not tied to a specific item)">
                {(value: string) =>
                  uniqueAssets.find((a) => String(a.asset_type_id) === value)
                    ?.display_name ?? "General (not tied to a specific item)"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {uniqueAssets.map((item) => (
                <SelectItem
                  key={item.asset_type_id}
                  value={String(item.asset_type_id)}
                >
                  {item.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder='What changed? e.g. "The ceiling fan stopped working in March."'
          className="w-full resize-y rounded-[9px] border border-[#d8cebf] bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2.5">
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-[9px] py-2.5"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 border-b border-[#ded3c2] pb-4.5">
        <span className="text-[11px] font-semibold tracking-[.14em] text-muted-foreground uppercase">
          Your allocation
        </span>
        <span className="font-heading text-2xl font-semibold text-foreground">
          {room.hall_name} · Room {room.room_number}
          {room.corner_label ? ` ${room.corner_label}` : ""}
        </span>
      </div>

      {!room.has_baseline ? (
        <p className="text-sm text-muted-foreground">
          Your room&apos;s baseline has not been recorded by the Porter yet.
          Check back soon.
        </p>
      ) : (
        <>
          {room.pending && (
            <div className="flex items-center gap-3 rounded-[12px] border border-[#f0d3a8] bg-[#fbeed9] px-4.5 py-3.5">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="#8a5a12"
                strokeWidth="1.8"
                className="shrink-0"
              >
                <path d="M12 8v4M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <span className="text-[13.5px] leading-[1.5] text-[#8a5a12]">
                <strong>Action needed:</strong> sign off on your check-in slip
                below. Review each group and confirm — or dispute with a note.
              </span>
            </div>
          )}

          <div className="grid items-start gap-4 md:grid-cols-2">
            {room.baseline_id !== null && (
              <>
                <SignOffPanel
                  baselineId={room.baseline_id}
                  group="corner"
                  title="My Corner"
                  items={room.corner}
                  signOff={room.corner_sign_off}
                  onSigned={onSigned}
                />
                <SignOffPanel
                  baselineId={room.baseline_id}
                  group="shared"
                  title="Shared Room Items"
                  items={room.shared}
                  signOff={room.shared_sign_off}
                  onSigned={onSigned}
                />
              </>
            )}
          </div>

          <div className="rounded-[12px] border border-border bg-secondary p-4.5">
            <ConditionReportForm
              assetOptions={[...room.corner, ...room.shared]}
            />
          </div>
        </>
      )}
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
    <AppShell title="My Room">
      <div className="flex flex-col gap-5">
        <Link
          href="/student/history"
          className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary"
        >
          View my session history
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
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
      </div>
    </AppShell>
  );
}

export default function StudentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <StudentDashboardContent />
    </RoleGuard>
  );
}
