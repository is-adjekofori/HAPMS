import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminNav } from "@/components/AdminNav";

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardShell title="Administrator Dashboard">
        <AdminNav />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Dashboard summary lands in T9.5. Use the links above to manage halls,
          rooms, users, and sessions.
        </p>
      </DashboardShell>
    </RoleGuard>
  );
}
