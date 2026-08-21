"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ProfileMenu } from "@/components/ProfileMenu";
import { clearToken, getCurrentAuth, type UserRole } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  d: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const ICONS = {
  dashboard: "M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-4H4zM13 7h7V4h-7z",
  halls: "M5 21V4h9v17M14 9h5v12M4 21h16M8 8h3M8 12h3M8 16h3",
  rooms: "M6 21V4h10v17M6 21h12M13 12h.01",
  users: "M16 21v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  assignments: "M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5",
  sessions: "M4 8h16M7 4v3M17 4v3M5 6h14v14H5zM9 12h.01M13 12h.01M9 16h.01",
  reports: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  auditLog: "M4 6h16M4 12h16M4 18h9M17 17l2 2 3-3",
  signOut: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

function navDef(role: UserRole): NavGroup[] {
  if (role === "admin") {
    return [
      {
        label: "Overview",
        items: [{ href: "/admin", label: "Dashboard", d: ICONS.dashboard }],
      },
      {
        label: "Configure",
        items: [
          { href: "/admin/halls", label: "Halls", d: ICONS.halls },
          { href: "/admin/rooms", label: "Rooms", d: ICONS.rooms },
          { href: "/admin/users", label: "Users", d: ICONS.users },
          {
            href: "/admin/porter-assignments",
            label: "Assignments",
            d: ICONS.assignments,
          },
          { href: "/admin/sessions", label: "Sessions", d: ICONS.sessions },
        ],
      },
      {
        label: "Monitor",
        items: [
          { href: "/admin/reports", label: "Reports", d: ICONS.reports },
          { href: "/admin/audit-log", label: "Audit log", d: ICONS.auditLog },
        ],
      },
    ];
  }
  if (role === "porter") {
    return [
      { items: [{ href: "/porter", label: "My rooms", d: ICONS.rooms }] },
    ];
  }
  return [
    {
      items: [
        { href: "/student", label: "My room", d: ICONS.rooms },
        { href: "/student/history", label: "History", d: ICONS.auditLog },
      ],
    },
  ];
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  porter: "Porter",
  student: "Student",
};

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

interface AppShellProps {
  title: string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getCurrentAuth();
  const role = auth?.role ?? "admin";
  const roleLabel = ROLE_LABELS[role];
  const groups = navDef(role);
  const flatItems = groups.flatMap((g) => g.items);
  const scrollableBottomBar = flatItems.length > 5;

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop icon rail */}
      <aside className="hidden w-[242px] shrink-0 flex-col gap-1 bg-sidebar p-3.5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-4">
          <div className="flex size-8.5 items-center justify-center rounded-lg border border-[rgba(233,197,106,0.35)]">
            <span className="font-heading text-[19px] font-semibold text-sidebar-primary">
              H
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-base font-semibold text-sidebar-foreground">
              HAPMS
            </span>
            <span className="text-[10.5px] font-semibold tracking-[.12em] text-sidebar-foreground/60 uppercase">
              {roleLabel}
            </span>
          </div>
        </div>
        <div className="mx-1 mb-2 h-px bg-sidebar-border" />
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-2 flex flex-col gap-0.5">
              {group.label && (
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[.14em] text-sidebar-foreground/50 uppercase">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "border-transparent text-sidebar-foreground/70 hover:bg-white/[.06]"
                    }`}
                  >
                    <Icon d={item.d} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="mx-1 mt-1.5 mb-1.5 h-px bg-sidebar-border" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/[.06] hover:text-sidebar-foreground"
        >
          <Icon d={ICONS.signOut} />
          <span>Sign out</span>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-secondary px-5 py-4.5 md:px-8">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold tracking-[.13em] text-muted-foreground uppercase">
              {roleLabel}
            </span>
            <h1 className="font-heading text-[22px] leading-none font-semibold tracking-tight text-foreground md:text-[28px]">
              {title}
            </h1>
          </div>
          <ProfileMenu />
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4.5 pb-8 md:p-8">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className={`sticky bottom-0 z-10 flex gap-1 bg-sidebar p-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden ${scrollableBottomBar ? "overflow-x-auto" : ""}`}
        >
          {flatItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1.5 rounded-[11px] px-1.5 py-2.5 text-center transition-colors ${
                  scrollableBottomBar ? "min-w-[72px] flex-none" : "flex-1"
                } ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/60"}`}
              >
                <Icon d={item.d} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className={`flex flex-col items-center gap-1.5 rounded-[11px] px-1.5 py-2.5 text-center text-sidebar-foreground/60 transition-colors ${
              scrollableBottomBar ? "min-w-[72px] flex-none" : "flex-1"
            }`}
          >
            <Icon d={ICONS.signOut} />
            <span className="text-[10px] font-semibold">Sign out</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
