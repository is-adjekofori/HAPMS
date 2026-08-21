"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";

type Condition = "good" | "fair" | "damaged";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "damaged", label: "Damaged" },
];

interface AssetTypeOption {
  asset_type_id: number;
  code: string;
  display_name: string;
  sign_off_group: "corner" | "shared";
  default_quantity: number;
  notes: string | null;
}

// Per-condition quantity buckets for one asset type - a room can hold
// several units of one item split across conditions (e.g. 2 good bunk beds
// + 2 damaged), so quantity and condition are no longer a single pair.
type Buckets = Record<Condition, number>;

const EMPTY_BUCKETS: Buckets = { good: 0, fair: 0, damaged: 0 };

function BaselineFormContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();

  const {
    data: assetTypes,
    loading,
    error: loadError,
  } = useApiResource<AssetTypeOption[]>(`/porter/rooms/${roomId}/asset-types`);

  // Per-asset-type condition buckets, keyed by asset_type_id. Entries are
  // created lazily on first edit; anything untouched falls back to the asset
  // type's default_quantity (all "good") at render and submit time. This
  // avoids seeding state in an effect (and the resulting lint warning).
  const [items, setItems] = useState<Record<number, Buckets>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The seeded (effective) buckets for an asset type: edited values if the
  // Porter has touched it, otherwise the server default (all "good").
  function bucketsFor(at: AssetTypeOption): Buckets {
    return items[at.asset_type_id] ?? { ...EMPTY_BUCKETS, good: at.default_quantity };
  }

  function totalFor(at: AssetTypeOption): number {
    const buckets = bucketsFor(at);
    return buckets.good + buckets.fair + buckets.damaged;
  }

  // T4.2 returns asset types ordered; keep table before chair so auto-match
  // (T4.4) reads naturally. Look them up by code for the auto-match wiring.
  const tableId = useMemo(
    () => assetTypes?.find((at) => at.code === "table")?.asset_type_id ?? null,
    [assetTypes],
  );
  const chairId = useMemo(
    () => assetTypes?.find((at) => at.code === "chair")?.asset_type_id ?? null,
    [assetTypes],
  );

  function setBucket(assetTypeId: number, condition: Condition, value: number) {
    setItems((prev) => {
      const current = prev[assetTypeId] ?? EMPTY_BUCKETS;
      const updated = { ...current, [condition]: Math.max(0, value) };
      const next = { ...prev, [assetTypeId]: updated };
      // §7.2: chair count defaults to table's total count. Applied when the
      // table's total changes; the Porter can still override the chair
      // after. Mirrors the total into the chair's "good" bucket and clears
      // any fair/damaged split the Porter had set for it.
      if (assetTypeId === tableId && chairId !== null) {
        const total = updated.good + updated.fair + updated.damaged;
        next[chairId] = { good: total, fair: 0, damaged: 0 };
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!assetTypes) return;
    setSubmitting(true);
    try {
      await apiFetch(`/porter/rooms/${roomId}/baseline`, {
        method: "POST",
        body: {
          items: assetTypes.flatMap((at) => {
            const buckets = bucketsFor(at);
            return CONDITIONS.map((c) => ({
              asset_type_id: at.asset_type_id,
              quantity: buckets[c.value],
              condition: c.value,
            })).filter((entry) => entry.quantity > 0);
          }),
        },
      });
      router.push("/porter");
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
      setSubmitting(false);
    }
  }

  const corner =
    assetTypes?.filter((at) => at.sign_off_group === "corner") ?? [];
  const shared =
    assetTypes?.filter((at) => at.sign_off_group === "shared") ?? [];

  function renderRow(at: AssetTypeOption) {
    const buckets = bucketsFor(at);
    const total = totalFor(at);
    return (
      <div
        key={at.asset_type_id}
        className="flex flex-wrap items-center gap-4 border-b border-[#efe7db] px-4.5 py-3.5 last:border-0"
      >
        <div className="flex min-w-[140px] flex-1 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold text-foreground">
            {at.display_name}
          </span>
          {at.notes && (
            <span className="text-xs text-muted-foreground">{at.notes}</span>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            Total: {total}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {CONDITIONS.map((c) => (
            <div
              key={c.value}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[11px] font-semibold tracking-[.04em] text-muted-foreground uppercase">
                {c.label}
              </span>
              <div className="flex items-center overflow-hidden rounded-[9px] border border-[#ddd3c4] bg-secondary">
                <button
                  type="button"
                  aria-label={`Decrease ${at.display_name} ${c.label} quantity`}
                  onClick={() =>
                    setBucket(at.asset_type_id, c.value, buckets[c.value] - 1)
                  }
                  className="flex size-8 items-center justify-center text-base text-primary hover:bg-accent"
                >
                  −
                </button>
                <span className="min-w-7 text-center font-mono text-sm font-medium text-foreground">
                  {buckets[c.value]}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${at.display_name} ${c.label} quantity`}
                  onClick={() =>
                    setBucket(at.asset_type_id, c.value, buckets[c.value] + 1)
                  }
                  className="flex size-8 items-center justify-center text-base text-primary hover:bg-accent"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Record Baseline">
      <div className="flex max-w-[840px] flex-col gap-5.5">
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

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {assetTypes && assetTypes.length > 0 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5.5">
            {corner.length > 0 && (
              <div className="flex flex-col gap-3.5">
                <span className="font-heading text-lg font-semibold text-foreground">
                  Corner items
                </span>
                <div className="overflow-hidden rounded-[12px] border border-border bg-card">
                  {corner.map(renderRow)}
                </div>
              </div>
            )}

            {shared.length > 0 && (
              <div className="flex flex-col gap-3.5">
                <span className="font-heading text-lg font-semibold text-foreground">
                  Shared items
                </span>
                <div className="overflow-hidden rounded-[12px] border border-border bg-card">
                  {shared.map(renderRow)}
                </div>
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {submitting ? "Saving…" : "Save baseline"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function BaselineFormPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <BaselineFormContent />
    </RoleGuard>
  );
}
