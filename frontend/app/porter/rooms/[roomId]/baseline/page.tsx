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

interface ItemState {
  quantity: number;
  condition: Condition;
}

function BaselineFormContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();

  const {
    data: assetTypes,
    loading,
    error: loadError,
  } = useApiResource<AssetTypeOption[]>(`/porter/rooms/${roomId}/asset-types`);

  // Per-asset-type overrides, keyed by asset_type_id. Entries are created
  // lazily on first edit; anything untouched falls back to the asset type's
  // default_quantity / "good" at render and submit time. This avoids seeding
  // state in an effect (and the resulting lint warning).
  const [items, setItems] = useState<Record<number, ItemState>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The seeded (effective) quantity for an asset type: an edited value if the
  // Porter has touched it, otherwise the server default.
  function quantityFor(at: AssetTypeOption): number {
    return items[at.asset_type_id]?.quantity ?? at.default_quantity;
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

  function setQuantity(assetTypeId: number, value: number) {
    setItems((prev) => {
      const next = {
        ...prev,
        [assetTypeId]: { ...prev[assetTypeId], quantity: value },
      };
      // §7.2: chair count defaults to table count. Applied when the table
      // quantity changes; the Porter can still override the chair after.
      if (assetTypeId === tableId && chairId !== null) {
        next[chairId] = { ...next[chairId], quantity: value };
      }
      return next;
    });
  }

  function setCondition(assetTypeId: number, value: Condition) {
    setItems((prev) => ({
      ...prev,
      [assetTypeId]: { ...prev[assetTypeId], condition: value },
    }));
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
          items: assetTypes.map((at) => ({
            asset_type_id: at.asset_type_id,
            quantity: quantityFor(at),
            condition: items[at.asset_type_id]?.condition ?? "good",
          })),
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
    const state = items[at.asset_type_id];
    const qty = quantityFor(at);
    const cond = state?.condition ?? "good";
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
        </div>
        <div className="flex items-center overflow-hidden rounded-[9px] border border-[#ddd3c4] bg-secondary">
          <button
            type="button"
            aria-label={`Decrease ${at.display_name} quantity`}
            onClick={() => setQuantity(at.asset_type_id, Math.max(0, qty - 1))}
            className="flex size-9 items-center justify-center text-lg text-primary hover:bg-accent"
          >
            −
          </button>
          <span className="min-w-8.5 text-center font-mono text-[15px] font-medium text-foreground">
            {qty}
          </span>
          <button
            type="button"
            aria-label={`Increase ${at.display_name} quantity`}
            onClick={() => setQuantity(at.asset_type_id, qty + 1)}
            className="flex size-9 items-center justify-center text-lg text-primary hover:bg-accent"
          >
            +
          </button>
        </div>
        <div className="flex overflow-hidden rounded-[9px] border border-[#ddd3c4] bg-secondary">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`${at.display_name} condition ${c.label}`}
              onClick={() => setCondition(at.asset_type_id, c.value)}
              className={`px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                cond === c.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.label}
            </button>
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
