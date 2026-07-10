"use client";

import { useRouter } from "next/navigation";

import { clearToken } from "@/lib/auth";

interface DashboardShellProps {
  title: string;
  children?: React.ReactNode;
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
          {title}
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Log out
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
