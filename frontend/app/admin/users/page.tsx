"use client";

import { useState } from "react";
import { KeyRound, Plus, X } from "lucide-react";
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
      <DialogTrigger render={<Button />}>
        <Plus />
        Add user
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Add a user</DialogTitle>
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
            <Button type="submit" disabled={submitting}>
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
    <AdminShell title="Users">
      {credential && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <KeyRound className="text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            Temporary password for {credential.email}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Relay this now — it won&apos;t be shown again:{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900">
              {credential.password}
            </code>
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-6 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
            onClick={() => setCredential(null)}
          >
            <X className="size-4" />
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Porter and Student accounts. Admins are provisioned separately.
            </CardDescription>
          </div>
          <CreateUserDialog onCreated={setCredential} />
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "secondary" : "outline"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyUserId === user.id}
                          onClick={() => handleReset(user)}
                        >
                          Reset password
                        </Button>
                        {user.is_active && user.role !== "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busyUserId === user.id}
                                  className="text-destructive hover:text-destructive"
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
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UsersPageContent />
    </RoleGuard>
  );
}
