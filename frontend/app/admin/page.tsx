import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DashboardShell title="Administrator Dashboard">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Built out starting in Phase 3.
        </p>
      </DashboardShell>
    </RoleGuard>
  );
}
