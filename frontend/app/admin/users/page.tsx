"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = "porter" | "student";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "porter", label: "Porter" },
  { value: "student", label: "Student" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  porter: "Porter",
  student: "Student",
};

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserCreateResponse extends User {
  temporary_password: string;
}

interface ResetPasswordResponse {
  temporary_password: string;
}

function CreateUserDialog({
  onCreated,
}: {
  onCreated: (c: Credential) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("porter");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<UserCreateResponse>("/admin/users", {
        method: "POST",
        body: { full_name: fullName, email, role },
      });
      onCreated({ email: created.email, password: created.temporary_password });
      toast.success(
        `${ROLE_LABELS[role]} account created for ${created.email}`,
      );
      setFullName("");
      setEmail("");
      setRole("porter");
      setOpen(false);
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
        Add user
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              Add a user
            </DialogTitle>
            <DialogDescription>
              Only Porter and Student accounts are created here. A one-time
              temporary password is shown after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jane@uniben.edu"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole((v ?? "porter") as Role)}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue>
                    {(value: Role) => ROLE_LABELS[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {submitting ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface Credential {
  email: string;
  password: string;
}

function UsersPageContent() {
  const {
    data: users,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<User[]>("/admin/users");

  // The temporary password is only ever returned once (on create or reset).
  // Hold it here so the Admin can relay it before it's gone — there is no
  // email delivery in this phase.
  const [credential, setCredential] = useState<Credential | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  async function handleDeactivate(user: User) {
    setBusyUserId(user.id);
    try {
      await apiFetch<User>(`/admin/users/${user.id}/deactivate`, {
        method: "PATCH",
      });
      toast.success(`${user.full_name} deactivated`);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReset(user: User) {
    setBusyUserId(user.id);
    try {
      const result = await apiFetch<ResetPasswordResponse>(
        `/auth/reset-password/${user.id}`,
        { method: "POST" },
      );
      setCredential({ email: user.email, password: result.temporary_password });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <AppShell title="Users">
      <div className="flex flex-col gap-4.5">
        {credential && (
          <div className="relative flex items-start justify-between gap-3.5 rounded-xl border border-[#f0d3a8] bg-[#fbeed9] px-4.5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="#8a5a12"
                strokeWidth="1.8"
                className="mt-0.5 shrink-0"
              >
                <path d="M12 8v4M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[13.5px] font-semibold text-[#7a4e10]">
                  Temporary password for {credential.email}
                </span>
                <span className="text-[13px] leading-[1.55] text-[#8a5a12]">
                  Relay this to the user securely. It is displayed only once
                  and cannot be retrieved again.
                </span>
                <div className="mt-0.5 flex items-center gap-2.5">
                  <code className="rounded-[7px] border border-border bg-white px-3.5 py-2 font-mono text-sm font-medium tracking-[.02em] text-foreground">
                    {credential.password}
                  </code>
                  <span className="text-xs text-[#8a5a12]">
                    shown once — copy it now
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCredential(null)}
              className="shrink-0 rounded-md p-1 text-[#8a5a12] hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="size-4.5" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Users
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Porter and Student accounts. Admins are provisioned separately.
            </p>
          </div>
          <CreateUserDialog onCreated={setCredential} />
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!loading && !loadError && users?.length === 0 && (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        )}
        {users && users.length > 0 && (
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(44,16,41,.03)]">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Email
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Role
                  </TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold tracking-[.08em] text-muted-foreground uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#f7f1e8]">
                    <TableCell className="font-semibold text-foreground">
                      {user.full_name}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-[#5f5560]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        kind={
                          user.role === "porter"
                            ? "porter"
                            : user.role === "student"
                              ? "student"
                              : "admin"
                        }
                        label={ROLE_LABELS[user.role] ?? user.role}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusPill kind={user.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyUserId === user.id}
                          onClick={() => handleReset(user)}
                          className="rounded-lg border-[#ddd3c4] bg-secondary text-primary hover:bg-accent"
                        >
                          Reset password
                        </Button>
                        {user.is_active && user.role !== "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busyUserId === user.id}
                                  className="rounded-lg border-[#eec7c1] bg-[#fdf1ef] text-destructive hover:bg-[#fae9e6]"
                                />
                              }
                            >
                              Deactivate
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Deactivate {user.full_name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  They will no longer be able to log in. This
                                  can&apos;t be undone from here.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => handleDeactivate(user)}
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
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

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UsersPageContent />
    </RoleGuard>
  );
}
