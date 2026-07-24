"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";

type AssetCondition = "good" | "fair" | "damaged";
type VerificationCondition = "good" | "fair" | "damaged" | "missing";
type VerificationFlag = "ok" | "missing" | "damaged" | "quantity_mismatch";

const VERIFICATION_CONDITIONS: VerificationCondition[] = [
  "good",
  "fair",
  "damaged",
  "missing",
];

interface BaselineItem {
  id: number;
  asset_type_id: number;
  code: string;
  display_name: string;
  sign_off_group: "corner" | "shared";
  quantity: number;
  condition: AssetCondition;
  notes: string | null;
}

interface BaselineDetail {
  id: number;
  room_id: number;
  locked: boolean;
  items: BaselineItem[];
}

interface PorterRoomSummary {
  id: number;
  baseline_id: number | null;
}

interface VerificationItemResult {
  baseline_item_id: number;
  asset_type_id: number;
  code: string;
  display_name: string;
  current_quantity: number;
  current_condition: VerificationCondition;
  flag: VerificationFlag;
}

interface VerificationResult {
  verification_id: number;
  baseline_id: number;
  verified_at: string;
  items: VerificationItemResult[];
}

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "form"; baseline: BaselineDetail }
  | { kind: "result"; result: VerificationResult };

function flagStyle(flag: VerificationFlag): {
  label: string;
  className: string;
} {
  switch (flag) {
    case "ok":
      return { label: "OK", className: "text-green-700 dark:text-green-400" };
    case "missing":
      return { label: "Missing", className: "text-red-600 dark:text-red-400" };
    case "damaged":
      return {
        label: "Damaged",
        className: "text-orange-600 dark:text-orange-400",
      };
    case "quantity_mismatch":
      return {
        label: "Quantity mismatch",
        className: "text-amber-600 dark:text-amber-400",
      };
  }
}

function VerifyFormContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [entries, setEntries] = useState<
    Record<number, { quantity: number; condition: VerificationCondition }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ kind: "loading" });
      try {
        const rooms = await apiFetch<PorterRoomSummary[]>("/porter/rooms");
        const room = rooms.find((r) => String(r.id) === roomId);
        if (!room || room.baseline_id === null) {
          if (!cancelled) {
            setState({
              kind: "error",
              message: "This room has no baseline to verify yet.",
            });
          }
          return;
        }
        const baseline = await apiFetch<BaselineDetail>(
          `/porter/baselines/${room.baseline_id}`,
        );
        if (cancelled) return;
        if (baseline.locked) {
          setState({
            kind: "error",
            message:
              "This room's baseline has already been verified and locked.",
          });
          return;
        }
        setState({ kind: "form", baseline });
      } catch (err) {
        if (!cancelled) {
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
  }, [roomId]);

  function quantityFor(item: BaselineItem): number {
    return entries[item.id]?.quantity ?? item.quantity;
  }

  function conditionFor(item: BaselineItem): VerificationCondition {
    return entries[item.id]?.condition ?? item.condition;
  }

  function setQuantity(item: BaselineItem, quantity: number) {
    setEntries((prev) => ({
      ...prev,
      [item.id]: {
        quantity,
        condition: prev[item.id]?.condition ?? item.condition,
      },
    }));
  }

  function setCondition(item: BaselineItem, condition: VerificationCondition) {
    setEntries((prev) => ({
      ...prev,
      [item.id]: {
        quantity: prev[item.id]?.quantity ?? item.quantity,
        condition,
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "form") return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await apiFetch<VerificationResult>(
        `/porter/baselines/${state.baseline.id}/verify`,
        {
          method: "POST",
          body: {
            items: state.baseline.items.map((item) => ({
              baseline_item_id: item.id,
              current_quantity: quantityFor(item),
              current_condition: conditionFor(item),
            })),
          },
        },
      );
      setState({ kind: "result", result });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell title="Porter Dashboard">
      <button
        type="button"
        onClick={() => router.push("/porter")}
        className="mb-4 text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50"
      >
        ← Back to my rooms
      </button>

      <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Session-End Verification
      </h2>

      {state.kind === "loading" && (
        <p className="text-sm text-zinc-500">Loading…</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      {state.kind === "form" && (
        <>
          <p className="mb-5 text-xs text-zinc-500">
            Enter the room&apos;s current quantity and condition for each item.
            Submitting locks this room&apos;s baseline for the session — it
            can&apos;t be changed afterward.
          </p>
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="grid grid-cols-[1fr_100px_130px] gap-3 pb-1 text-xs font-medium text-zinc-500">
              <span>Asset (baseline qty / condition)</span>
              <span>Current qty</span>
              <span>Current condition</span>
            </div>
            {state.baseline.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_100px_130px] items-center gap-3 border-b border-zinc-100 py-2 dark:border-zinc-900"
              >
                <span className="text-sm text-black dark:text-zinc-50">
                  {item.display_name}{" "}
                  <span className="text-xs text-zinc-400">
                    ({item.quantity} / {item.condition})
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  aria-label={`${item.display_name} current quantity`}
                  value={quantityFor(item)}
                  onChange={(e) =>
                    setQuantity(item, Math.max(0, Number(e.target.value)))
                  }
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <select
                  aria-label={`${item.display_name} current condition`}
                  value={conditionFor(item)}
                  onChange={(e) =>
                    setCondition(item, e.target.value as VerificationCondition)
                  }
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm capitalize dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {VERIFICATION_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {submitError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {submitting ? "Submitting…" : "Submit verification & lock room"}
            </button>
          </form>
        </>
      )}

      {state.kind === "result" && (
        <>
          <p className="mb-5 text-xs text-zinc-500">
            Verified and locked. {state.result.items.length} item(s) checked.
          </p>
          <div className="max-w-2xl">
            <div className="grid grid-cols-[1fr_80px_100px_150px] gap-3 border-b border-zinc-200 pb-1 text-xs font-medium text-zinc-500 dark:border-zinc-800">
              <span>Asset</span>
              <span>Qty</span>
              <span>Condition</span>
              <span>Flag</span>
            </div>
            {state.result.items.map((item) => {
              const style = flagStyle(item.flag);
              return (
                <div
                  key={item.baseline_item_id}
                  className="grid grid-cols-[1fr_80px_100px_150px] items-center gap-3 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
                >
                  <span className="text-black dark:text-zinc-50">
                    {item.display_name}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {item.current_quantity}
                  </span>
                  <span className="capitalize text-zinc-600 dark:text-zinc-400">
                    {item.current_condition}
                  </span>
                  <span className={style.className}>{style.label}</span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => router.push("/porter")}
            className="mt-5 rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Back to my rooms
          </button>
        </>
      )}
    </DashboardShell>
  );
}

export default function VerifyFormPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <VerifyFormContent />
    </RoleGuard>
  );
}
