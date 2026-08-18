import { getToken } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Raw FastAPI `detail` payload, kept so callers can read structured error
    // fields (e.g. the session-close 409's unverified_room_ids) when needed.
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((e) =>
          e && typeof e === "object" && "msg" in e ? String(e.msg) : String(e),
        )
        .join(", ");
    }
    // Object detail (e.g. { message, unverified_room_ids }): surface message.
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  return "Something went wrong. Please try again.";
}

function extractDetail(body: unknown): unknown {
  if (body && typeof body === "object" && "detail" in body) {
    return (body as { detail: unknown }).detail;
  }
  return undefined;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

/** Thin fetch wrapper: attaches the Bearer token (unless auth: false), sends/
 * receives JSON, and centralizes error handling into a single ApiError shape
 * so callers don't each re-implement response.ok / JSON-parsing checks. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");
  // Bypasses ngrok's free-tier "you are about to visit" interstitial, which
  // otherwise intercepts browser-looking requests and returns an HTML page
  // with no CORS headers, breaking every call from the deployed frontend.
  requestHeaders.set("ngrok-skip-browser-warning", "true");

  if (auth) {
    const token = getToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(data),
      extractDetail(data),
    );
  }

  return data as T;
}
