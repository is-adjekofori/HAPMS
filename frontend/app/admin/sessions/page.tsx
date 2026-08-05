"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <DialogTrigger render={<Button />}>
        <Plus />
        Start session
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Start a session</DialogTitle>
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
            <Button type="submit" disabled={submitting}>
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
    <AdminShell title="Sessions">
      {closeError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Couldn&apos;t close the session</AlertTitle>
          <AlertDescription>
            <p>{closeError}</p>
            {unverifiedRooms && unverifiedRooms.length > 0 && (
              <p>Unverified room IDs: {unverifiedRooms.join(", ")}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Every hostel session, past and present.
            </CardDescription>
          </div>
          <CreateSessionDialog onCreated={refetch} />
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          session.status === "active" ? "secondary" : "outline"
                        }
                      >
                        {session.status === "active" ? "Active" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(session.started_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(session.closed_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busySessionId === session.id}
                                className="text-destructive hover:text-destructive"
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
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AdminSessionsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SessionsPageContent />
    </RoleGuard>
  );
}
