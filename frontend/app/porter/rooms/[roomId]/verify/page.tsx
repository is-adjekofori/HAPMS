"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import { PILL_STYLES, type PillKind } from "@/lib/pill";

type AssetCondition = "good" | "fair" | "damaged";
type VerificationCondition = "good" | "fair" | "damaged" | "missing";
type VerificationFlag = "ok" | "missing" | "damaged" | "quantity_mismatch";

const VERIFICATION_CONDITIONS: {
  value: VerificationCondition;
  label: string;
}[] = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
];

const FLAG_KIND: Record<VerificationFlag, PillKind> = {
  ok: "ok",
  missing: "missing",
  damaged: "damaged",
  quantity_mismatch: "quantityMismatch",
};

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

  const summary =
    state.kind === "result"
      ? (
          [
            "ok",
            "missing",
            "damaged",
            "quantity_mismatch",
          ] as VerificationFlag[]
        ).map((flag) => ({
          flag,
          count: state.result.items.filter((i) => i.flag === flag).length,
        }))
      : [];

  return (
    <AppShell title="Session-End Verification">
      <div className="flex max-w-[880px] flex-col gap-5">
        <button
          type="button"
          onClick={() => router.push("/porter")}
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
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to my rooms
        </button>

        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        {state.kind === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <p className="max-w-[65ch] text-[13.5px] leading-[1.6] text-muted-foreground">
              Enter the room&apos;s current quantity and condition for each
              item. Submitting locks this room&apos;s baseline for the session —
              it can&apos;t be changed afterward.
            </p>
            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              {state.baseline.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 border-b border-[#efe7db] px-4.5 py-3.5 last:border-0"
                >
                  <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                    <span className="text-[14.5px] font-semibold text-foreground">
                      {item.display_name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      baseline: {item.quantity} / {item.condition}
                    </span>
                  </div>
                  <div className="flex items-center overflow-hidden rounded-[9px] border border-[#ddd3c4] bg-secondary">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.display_name} current quantity`}
                      onClick={() =>
                        setQuantity(item, Math.max(0, quantityFor(item) - 1))
                      }
                      className="flex size-9 items-center justify-center text-lg text-primary hover:bg-accent"
                    >
                      −
                    </button>
                    <span className="min-w-8.5 text-center font-mono text-[15px] font-medium text-foreground">
                      {quantityFor(item)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.display_name} current quantity`}
                      onClick={() => setQuantity(item, quantityFor(item) + 1)}
                      className="flex size-9 items-center justify-center text-lg text-primary hover:bg-accent"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex overflow-hidden rounded-[9px] border border-[#ddd3c4] bg-secondary">
                    {VERIFICATION_CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        aria-label={`${item.display_name} current condition ${c.label}`}
                        onClick={() => setCondition(item, c.value)}
                        className={`px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                          conditionFor(item) === c.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-fit gap-2 rounded-[9px] py-3"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 11V7a5 5 0 0 1 10 0M4 11h12v9H4zM10 15v2" />
              </svg>
              {submitting ? "Submitting…" : "Submit verification & lock room"}
            </Button>
          </form>
        )}

        {state.kind === "result" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              {summary.map((s) => {
                const style = PILL_STYLES[FLAG_KIND[s.flag]];
                return (
                  <div
                    key={s.flag}
                    className="flex min-w-[130px] flex-1 items-center gap-2.5 rounded-[11px] border px-4 py-3"
                    style={{ background: style.bg, borderColor: style.border }}
                  >
                    <span
                      className="font-heading text-[28px] leading-none font-semibold"
                      style={{ color: style.color }}
                    >
                      {s.count}
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                      style={{ color: style.color }}
                    >
                      {style.dot && (
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: style.dot }}
                        />
                      )}
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-[14px] border border-border bg-card">
              <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1fr] gap-4 bg-secondary px-4.5 py-3">
                <span className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                  Asset
                </span>
                <span className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                  Current qty
                </span>
                <span className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                  Condition
                </span>
                <span className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                  Flag
                </span>
              </div>
              {state.result.items.map((item) => (
                <div
                  key={item.baseline_item_id}
                  className="grid grid-cols-[1.4fr_0.9fr_0.9fr_1fr] items-center gap-4 border-t border-[#efe7db] px-4.5 py-3.5"
                >
                  <span className="text-[14px] font-semibold text-foreground">
                    {item.display_name}
                  </span>
                  <span className="font-mono text-[13px] text-[#5f5560]">
                    {item.current_quantity}
                  </span>
                  <span className="text-[13.5px] text-muted-foreground capitalize">
                    {item.current_condition}
                  </span>
                  <StatusPill kind={FLAG_KIND[item.flag]} />
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={() => router.push("/porter")}
              className="w-fit rounded-[9px] py-3"
            >
              Back to my rooms
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function VerifyFormPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <VerifyFormContent />
    </RoleGuard>
  );
}
