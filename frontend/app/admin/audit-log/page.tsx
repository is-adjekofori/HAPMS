"use client";

import { useEffect, useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

type Tone = "ok" | "warn" | "alert" | "neutral";

const TONE_STYLES: Record<Tone, { bg: string; color: string; d: string }> = {
  ok: { bg: "#e6f1e8", color: "#2f7d4f", d: "M20 6 9 17l-5-5" },
  warn: {
    bg: "#fbeed9",
    color: "#b8600a",
    d: "M8 12h8M12 8v8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  },
  alert: {
    bg: "#fae9e6",
    color: "#b3261e",
    d: "M12 3 2 20h20L12 3ZM12 9v5M12 17h.01",
  },
  neutral: { bg: "#efe4ec", color: "#5b2350", d: "M4 6h16M4 12h16M4 18h9" },
};

function auditTone(entry: AuditLogEntry): Tone {
  if (entry.action === "CREATE_SIGNOFF") {
    return entry.description?.startsWith("Contested") ? "warn" : "ok";
  }
  if (entry.action === "DEACTIVATE_USER") return "alert";
  if (entry.action === "CLOSE_SESSION" || entry.action === "CREATE_SESSION") {
    return "ok";
  }
  return "neutral";
}

// Dispute comments are embedded by the backend as `... — "comment text"`;
// split them out so they render as a quoted callout, matching the audit
// trail's presentation of BR-4.10 dispute visibility.
function splitComment(description: string): {
  text: string;
  comment: string | null;
} {
  const match = description.match(/^([\s\S]*) — "([\s\S]*)"$/);
  if (match) return { text: match[1], comment: match[2] };
  return { text: description, comment: null };
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
    <AppShell title="Audit Log">
      <div className="flex max-w-[940px] flex-col gap-4.5">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Audit Trail
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Every action taken across the system, most recent first.
          </p>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        )}

        {entries.length > 0 && (
          <div className="rounded-[14px] border border-border bg-card px-5.5 shadow-[0_1px_2px_rgba(44,16,41,.03)]">
            {entries.map((entry, i) => {
              const tone = TONE_STYLES[auditTone(entry)];
              const { text, comment } = splitComment(entry.description ?? "—");
              return (
                <div
                  key={entry.id}
                  className="flex gap-4 border-b border-[#efe7db] py-4 last:border-0"
                >
                  <div className="flex shrink-0 flex-col items-center">
                    <div
                      className="flex size-8.5 items-center justify-center rounded-[9px]"
                      style={{ background: tone.bg }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        fill="none"
                        stroke={tone.color}
                        strokeWidth="1.8"
                      >
                        <path d={tone.d} />
                      </svg>
                    </div>
                    {i < entries.length - 1 && (
                      <div className="mt-1 min-h-3.5 w-0.5 flex-1 bg-[#efe7db]" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className="rounded-md border px-2.5 py-1 font-mono text-[11.5px] font-medium tracking-[.02em]"
                        style={{
                          background: tone.bg,
                          color: tone.color,
                          borderColor: `${tone.color}22`,
                        }}
                      >
                        {entry.action}
                      </span>
                      <span className="font-mono text-[12.5px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-sm leading-[1.55] text-[#3f3540]">
                      {text}
                    </span>
                    {comment && (
                      <div className="mt-0.5 border-l-[3px] border-[#e0cfdb] pl-3 text-[13px] leading-[1.5] text-[#6b5f67] italic">
                        &ldquo;{comment}&rdquo;
                      </div>
                    )}
                    <span className="text-[12.5px] text-muted-foreground">
                      by {entry.user_name ?? "—"}
                    </span>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  className="gap-2 rounded-[9px] border-[#ddd3c4] bg-secondary text-[#5f5560]"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AuditLogPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AuditLogContent />
    </RoleGuard>
  );
}
