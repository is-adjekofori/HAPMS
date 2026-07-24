"use client";

import { useEffect, useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { apiFetch, ApiError } from "@/lib/api";

const PAGE_SIZE = 50;

interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string | null;
  created_at: string;
}

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const page = await apiFetch<AuditLogEntry[]>(
          `/admin/audit-log?limit=${PAGE_SIZE}&offset=0`,
        );
        if (!cancelled) {
          setEntries(page);
          setHasMore(page.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to reach the server.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await apiFetch<AuditLogEntry[]>(
        `/admin/audit-log?limit=${PAGE_SIZE}&offset=${entries.length}`,
      );
      setEntries((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Audit Trail
      </h2>
      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-zinc-500">No activity recorded yet.</p>
      )}
      {entries.length > 0 && (
        <div className="max-w-3xl">
          <div className="grid grid-cols-[150px_120px_1fr_170px] gap-3 border-b border-zinc-200 pb-1 text-xs font-medium text-zinc-500 dark:border-zinc-800">
            <span>When</span>
            <span>Who</span>
            <span>What</span>
            <span>Action</span>
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[150px_120px_1fr_170px] gap-3 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
            >
              <span className="text-zinc-500">
                {new Date(entry.created_at).toLocaleString()}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {entry.user_name ?? "—"}
              </span>
              <span className="text-black dark:text-zinc-50">
                {entry.description ?? "—"}
              </span>
              <span className="text-xs text-zinc-400">{entry.action}</span>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </DashboardShell>
  );
}

export default function AuditLogPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AuditLogContent />
    </RoleGuard>
  );
}
