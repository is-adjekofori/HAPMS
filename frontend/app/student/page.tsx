import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function StudentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <DashboardShell title="Student Dashboard">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Built out starting in Phase 5.
        </p>
      </DashboardShell>
    </RoleGuard>
  );
}
