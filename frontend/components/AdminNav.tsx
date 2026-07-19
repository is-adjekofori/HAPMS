"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Grows as each Admin page lands (T3.6-T3.10); only add a link once its page exists.
const LINKS = [
  { href: "/admin/halls", label: "Halls" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/porter-assignments", label: "Porters" },
  { href: "/admin/sessions", label: "Sessions" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "text-sm font-medium text-black dark:text-zinc-50"
              : "text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
