"use client";

import { useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

interface HostelSession {
  id: number;
  name: string;
  status: string;
  started_at: string;
  closed_at: string | null;
}

// Value for a datetime-local input representing "now" in local time.
function nowLocalInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function SessionsPageContent() {
  const {
    data: sessions,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<HostelSession[]>("/admin/sessions");

  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState(nowLocalInput());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [closeError, setCloseError] = useState<string | null>(null);
  const [unverifiedRooms, setUnverifiedRooms] = useState<number[] | null>(null);
  const [busySessionId, setBusySessionId] = useState<number | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch<HostelSession>("/admin/sessions", {
        method: "POST",
        // datetime-local has no timezone; append the local offset so the
        // backend stores the instant the Admin actually picked.
        body: { name, started_at: new Date(startedAt).toISOString() },
      });
      setName("");
      setStartedAt(nowLocalInput());
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(session: HostelSession) {
    setCloseError(null);
    setUnverifiedRooms(null);
    setBusySessionId(session.id);
    try {
      await apiFetch<HostelSession>(`/admin/sessions/${session.id}/close`, {
        method: "PATCH",
      });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        setCloseError(err.message);
        // The close gate returns { message, unverified_room_ids } on 409.
        const detail = err.detail;
        if (
          detail &&
          typeof detail === "object" &&
          "unverified_room_ids" in detail
        ) {
          const ids = (detail as { unverified_room_ids: unknown })
            .unverified_room_ids;
          if (Array.isArray(ids)) setUnverifiedRooms(ids.map(Number));
        }
      } else {
        setCloseError("Unable to reach the server.");
      }
    } finally {
      setBusySessionId(null);
    }
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sessions
          </h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {loadError}
            </p>
          )}
          {closeError && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
              <p className="text-red-700 dark:text-red-300">{closeError}</p>
              {unverifiedRooms && unverifiedRooms.length > 0 && (
                <p className="mt-1 text-red-600 dark:text-red-400">
                  Unverified room IDs: {unverifiedRooms.join(", ")}
                </p>
              )}
            </div>
          )}
          {!loading && !loadError && sessions?.length === 0 && (
            <p className="text-sm text-zinc-500">No sessions yet.</p>
          )}
          {sessions && sessions.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Started</th>
                  <th className="py-2 pr-4 font-medium">Closed</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {session.name}
                    </td>
                    <td className="py-2 pr-4">
                      {session.status === "active" ? (
                        <span className="text-green-700 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="text-zinc-400">Closed</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {formatDate(session.started_at)}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {formatDate(session.closed_at)}
                    </td>
                    <td className="py-2">
                      {session.status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleClose(session)}
                          disabled={busySessionId === session.id}
                          className="text-xs font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
                        >
                          {busySessionId === session.id ? "Closing…" : "Close"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={handleCreate}
          className="h-fit space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start a session
          </h2>

          <div className="space-y-1">
            <label
              htmlFor="name"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2025/2026"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="started_at"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Start date & time
            </label>
            <input
              id="started_at"
              type="datetime-local"
              required
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Starting…" : "Start session"}
          </button>
          <p className="text-xs text-zinc-500">
            Only one session can be active at a time. Close the current one
            before starting another.
          </p>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function AdminSessionsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SessionsPageContent />
    </RoleGuard>
  );
}
