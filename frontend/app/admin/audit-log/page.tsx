"use client";

import { useEffect, useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <AdminShell title="Audit Log">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Every action taken across the system, most recent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>What</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.user_name ?? "—"}
                      </TableCell>
                      <TableCell>{entry.description ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.action}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMore && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AuditLogPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AuditLogContent />
    </RoleGuard>
  );
}
