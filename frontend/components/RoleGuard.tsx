"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentAuth,
  dashboardPathForRole,
  type UserRole,
} from "@/lib/auth";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/** Client-side route guard: redirects to /login if there's no valid session,
 * or to the user's own dashboard if their role isn't allowed on this page.
 * This is a UI convenience only — every actual data-fetching request is
 * independently authorized by the backend's require_role dependency (T2.3). */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const auth = getCurrentAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(auth.role)) {
      router.replace(dashboardPathForRole(auth.role));
      return;
    }
    // localStorage (read via getCurrentAuth) is an external source not available
    // at render/SSR time, so syncing it into state here is the correct use of
    // an effect, not the render-derivable-state case this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true);
  }, [router, allowedRoles]);

  if (!authorized) return null;
  return <>{children}</>;
}
