import { RoleGuard } from "@/components/RoleGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function PorterDashboardPage() {
  return (
    <RoleGuard allowedRoles={["porter"]}>
      <DashboardShell title="Porter Dashboard">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Built out starting in Phase 4.
        </p>
      </DashboardShell>
    </RoleGuard>
  );
}
