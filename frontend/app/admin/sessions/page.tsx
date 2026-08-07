"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function CreateSessionDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState(nowLocalInput());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      toast.success(`Session "${name}" started`);
      setName("");
      setStartedAt(nowLocalInput());
      setOpen(false);
      onCreated();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 rounded-[9px]" />}>
        <Plus className="size-4" />
        Start session
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              Start a session
            </DialogTitle>
            <DialogDescription>
              Only one session can be active at a time. Close the current one
              before starting another.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2025/2026"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="started_at">Start date &amp; time</Label>
              <Input
                id="started_at"
                type="datetime-local"
                required
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting} className="rounded-[9px]">
              {submitting ? "Starting…" : "Start session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionsPageContent() {
  const {
    data: sessions,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<HostelSession[]>("/admin/sessions");

  const [closeError, setCloseError] = useState<string | null>(null);
  const [unverifiedRooms, setUnverifiedRooms] = useState<number[] | null>(null);
  const [busySessionId, setBusySessionId] = useState<number | null>(null);

  async function handleClose(session: HostelSession) {
    setCloseError(null);
    setUnverifiedRooms(null);
    setBusySessionId(session.id);
    try {
      await apiFetch<HostelSession>(`/admin/sessions/${session.id}/close`, {
        method: "PATCH",
      });
      toast.success(`Session "${session.name}" closed`);
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
    <AppShell title="Sessions">
      <div className="flex flex-col gap-4.5">
        {closeError && (
          <div className="flex items-start gap-3 rounded-xl border border-[#eec7c1] bg-[#fae9e6] px-4.5 py-4">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="#b3261e"
              strokeWidth="1.8"
              className="mt-0.5 shrink-0"
            >
              <path d="M12 8v4M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold text-[#9a1f18]">
                {closeError}
              </span>
              {unverifiedRooms && unverifiedRooms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {unverifiedRooms.map((id) => (
                    <code
                      key={id}
                      className="rounded-md border border-[#eec7c1] bg-white px-2 py-1 font-mono text-[12.5px] text-destructive"
                    >
                      Room #{id}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Sessions
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Every hostel session, past and present.
            </p>
          </div>
          <CreateSessionDialog onCreated={refetch} />
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!loading && !loadError && sessions?.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        )}
        {sessions && sessions.length > 0 && (
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(44,16,41,.03)]">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Started
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Closed
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-[#f7f1e8]">
                    <TableCell className="font-semibold text-foreground">
                      {session.name}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        kind={session.status === "active" ? "active" : "closed"}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-[#5f5560]">
                      {formatDate(session.started_at)}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-[#5f5560]">
                      {formatDate(session.closed_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busySessionId === session.id}
                                className="rounded-lg border-[#eec7c1] bg-[#fdf1ef] text-destructive hover:bg-[#fae9e6]"
                              />
                            }
                          >
                            {busySessionId === session.id
                              ? "Closing…"
                              : "Close"}
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Close &quot;{session.name}&quot;?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Every room&apos;s baseline must already be
                                verified. If any room isn&apos;t, closing will
                                be rejected and the outstanding rooms listed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleClose(session)}
                              >
                                Close session
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminSessionsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SessionsPageContent />
    </RoleGuard>
  );
}
