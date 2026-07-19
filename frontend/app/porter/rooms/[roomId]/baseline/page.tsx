"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

type Condition = "good" | "fair" | "damaged";

const CONDITIONS: Condition[] = ["good", "fair", "damaged"];

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
    return (
      <div
        key={at.asset_type_id}
        className="grid grid-cols-[1fr_90px_120px] items-center gap-3 border-b border-zinc-100 py-2 dark:border-zinc-900"
      >
        <div>
          <p className="text-sm text-black dark:text-zinc-50">
            {at.display_name}
          </p>
          {at.notes && <p className="text-xs text-zinc-500">{at.notes}</p>}
        </div>
        <input
          type="number"
          min={0}
          aria-label={`${at.display_name} quantity`}
          value={quantityFor(at)}
          onChange={(e) =>
            setQuantity(at.asset_type_id, Math.max(0, Number(e.target.value)))
          }
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          aria-label={`${at.display_name} condition`}
          value={state?.condition ?? "good"}
          onChange={(e) =>
            setCondition(at.asset_type_id, e.target.value as Condition)
          }
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm capitalize dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    );
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
        Record Room Baseline
      </h2>
      <p className="mb-5 text-xs text-zinc-500">
        Only asset types valid for this room&apos;s hall are shown, pre-filled
        with default quantities. Adjust quantity and condition as needed.
      </p>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {assetTypes && assetTypes.length > 0 && (
        <form onSubmit={handleSubmit} className="max-w-xl">
          <div className="grid grid-cols-[1fr_90px_120px] gap-3 pb-1 text-xs font-medium text-zinc-500">
            <span>Asset</span>
            <span>Qty</span>
            <span>Condition</span>
          </div>

          {corner.length > 0 && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Corner items
              </p>
              {corner.map(renderRow)}
            </>
          )}

          {shared.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Shared items
              </p>
              {shared.map(renderRow)}
            </>
          )}

          {formError && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Saving…" : "Save baseline"}
          </button>
        </form>
      )}
    </DashboardShell>
  );
}

export default function BaselineFormPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <BaselineFormContent />
    </RoleGuard>
  );
}
