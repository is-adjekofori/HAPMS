"use client";

import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/StatusPill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearToken, type UserRole } from "@/lib/auth";
import { useApiResource } from "@/lib/useApiResource";

interface Me {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

function UserIcon({ className }: { className?: string }) {
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
      <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  );
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileMenu() {
  const router = useRouter();
  const { data: me } = useApiResource<Me>("/auth/me");

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          />
        }
      >
        {me ? (
          <span className="font-heading text-[13px] font-semibold">
            {initials(me.full_name)}
          </span>
        ) : (
          <UserIcon className="size-4.5" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="flex flex-col gap-2 px-2 py-2.5">
          {me ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="font-heading text-[15px] font-semibold text-foreground">
                  {me.full_name}
                </span>
                <span className="truncate text-[12.5px] text-muted-foreground">
                  {me.email}
                </span>
              </div>
              <div>
                <StatusPill kind={me.role} />
              </div>
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              Loading profile…
            </span>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
