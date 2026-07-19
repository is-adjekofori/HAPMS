"use client";

import { useState } from "react";

import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

type Role = "porter" | "student";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "porter", label: "Porter" },
  { value: "student", label: "Student" },
];

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

function UsersPageContent() {
  const {
    data: users,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<User[]>("/admin/users");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("porter");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The temporary password is only ever returned once (on create or reset).
  // Hold it here so the Admin can relay it before it's gone — there is no
  // email delivery in this phase.
  const [credential, setCredential] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<UserCreateResponse>("/admin/users", {
        method: "POST",
        body: { full_name: fullName, email, role },
      });
      setCredential({
        email: created.email,
        password: created.temporary_password,
      });
      setFullName("");
      setEmail("");
      setRole("porter");
      refetch();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(user: User) {
    setRowError(null);
    setBusyUserId(user.id);
    try {
      await apiFetch<User>(`/admin/users/${user.id}/deactivate`, {
        method: "PATCH",
      });
      refetch();
    } catch (err) {
      setRowError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReset(user: User) {
    setRowError(null);
    setBusyUserId(user.id);
    try {
      const result = await apiFetch<ResetPasswordResponse>(
        `/auth/reset-password/${user.id}`,
        { method: "POST" },
      );
      setCredential({
        email: user.email,
        password: result.temporary_password,
      });
    } catch (err) {
      setRowError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <DashboardShell title="Administrator Dashboard">
      <AdminNav />

      {credential && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Temporary password for {credential.email}
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Relay this now — it won&apos;t be shown again:{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-900">
              {credential.password}
            </code>
          </p>
          <button
            type="button"
            onClick={() => setCredential(null)}
            className="mt-2 text-xs font-medium text-amber-700 underline dark:text-amber-400"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Users
          </h2>
          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {loadError}
            </p>
          )}
          {rowError && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">
              {rowError}
            </p>
          )}
          {!loading && !loadError && users?.length === 0 && (
            <p className="text-sm text-zinc-500">No users yet.</p>
          )}
          {users && users.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {user.full_name}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {user.email}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {user.role}
                    </td>
                    <td className="py-2 pr-4">
                      {user.is_active ? (
                        <span className="text-green-700 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="text-zinc-400">Inactive</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleReset(user)}
                          disabled={busyUserId === user.id}
                          className="text-xs font-medium text-zinc-600 underline disabled:opacity-50 dark:text-zinc-400"
                        >
                          Reset password
                        </button>
                        {user.is_active && user.role !== "admin" && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(user)}
                            disabled={busyUserId === user.id}
                            className="text-xs font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
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
            Add a user
          </h2>

          <div className="space-y-1">
            <label
              htmlFor="full_name"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Full name
            </label>
            <input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@uniben.edu"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="role"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            {submitting ? "Adding…" : "Add user"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UsersPageContent />
    </RoleGuard>
  );
}
