const TOKEN_KEY = "hapms_token";

export type UserRole = "admin" | "porter" | "student";

interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

export interface CurrentAuth {
  token: string;
  userId: number;
  role: UserRole;
}

/** Reads the stored token and returns the decoded auth state, or null if
 * there is no token, it's malformed, or it has expired. Expiry is checked
 * client-side only for UI routing (RoleGuard) — the backend independently
 * validates every request's token regardless of what the client believes. */
export function getCurrentAuth(): CurrentAuth | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  if (payload.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }

  return { token, userId: Number(payload.sub), role: payload.role };
}

export function dashboardPathForRole(role: UserRole): string {
  return `/${role}`;
}
