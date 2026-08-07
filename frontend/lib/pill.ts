/**
 * Status-pill color/label lookup, ported from the approved HAPMS Redesign
 * prototype's `pill()` dictionary. Every kind maps 1:1 to a real status
 * value already returned by the API — this is presentation only, no new
 * statuses are introduced.
 */
export type PillKind =
  | "active"
  | "closed"
  | "inactive"
  | "regular"
  | "special"
  | "porter"
  | "student"
  | "admin"
  | "confirmed"
  | "pendingSignoff"
  | "clean"
  | "flagged"
  | "notRecorded"
  | "recorded"
  | "pendingVerification"
  | "locked"
  | "ok"
  | "missing"
  | "damaged"
  | "quantityMismatch"
  | "current"
  | "vacated"
  | "disputed";

export interface PillStyle {
  label: string;
  bg: string;
  color: string;
  border: string;
  dot?: string;
}

export const PILL_STYLES: Record<PillKind, PillStyle> = {
  active: {
    label: "Active",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  closed: {
    label: "Closed",
    bg: "#eee9e3",
    color: "#7a6f77",
    border: "#ddd3c4",
    dot: "#b0a4ac",
  },
  inactive: {
    label: "Inactive",
    bg: "#eee9e3",
    color: "#7a6f77",
    border: "#ddd3c4",
    dot: "#b0a4ac",
  },
  regular: {
    label: "Regular",
    bg: "#efe4ec",
    color: "#5b2350",
    border: "#e0cfdb",
  },
  special: {
    label: "Special",
    bg: "#fbeed9",
    color: "#8a5a12",
    border: "#f0d3a8",
  },
  porter: {
    label: "Porter",
    bg: "#e8eef6",
    color: "#3a5a8a",
    border: "#c9d6e8",
  },
  student: {
    label: "Student",
    bg: "#efe4ec",
    color: "#5b2350",
    border: "#e0cfdb",
  },
  admin: { label: "Admin", bg: "#e8eef6", color: "#3a5a8a", border: "#c9d6e8" },
  confirmed: {
    label: "Confirmed",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  pendingSignoff: {
    label: "Pending",
    bg: "#fbeed9",
    color: "#8a5a12",
    border: "#f0d3a8",
    dot: "#c89a3f",
  },
  clean: {
    label: "No flags",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  flagged: {
    label: "Flagged",
    bg: "#fae9e6",
    color: "#b3261e",
    border: "#eec7c1",
    dot: "#d1493c",
  },
  notRecorded: {
    label: "Not recorded",
    bg: "#eee9e3",
    color: "#7a6f77",
    border: "#ddd3c4",
    dot: "#b0a4ac",
  },
  recorded: {
    label: "Baseline recorded",
    bg: "#e8eef6",
    color: "#3a5a8a",
    border: "#c9d6e8",
    dot: "#5a7bb0",
  },
  pendingVerification: {
    label: "Pending verification",
    bg: "#fbeed9",
    color: "#8a5a12",
    border: "#f0d3a8",
    dot: "#c89a3f",
  },
  locked: {
    label: "Verified & locked",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  ok: {
    label: "OK",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  missing: {
    label: "Missing",
    bg: "#fae9e6",
    color: "#b3261e",
    border: "#eec7c1",
    dot: "#d1493c",
  },
  damaged: {
    label: "Damaged",
    bg: "#fbe3d5",
    color: "#b8600a",
    border: "#f0cca6",
    dot: "#d98a2b",
  },
  quantityMismatch: {
    label: "Qty mismatch",
    bg: "#fbeed9",
    color: "#8a5a12",
    border: "#f0d3a8",
    dot: "#c89a3f",
  },
  current: {
    label: "Current",
    bg: "#e6f1e8",
    color: "#2f7d4f",
    border: "#c2ddc9",
    dot: "#3f9d5b",
  },
  vacated: {
    label: "Vacated",
    bg: "#eee9e3",
    color: "#7a6f77",
    border: "#ddd3c4",
    dot: "#b0a4ac",
  },
  disputed: {
    label: "Disputed",
    bg: "#fbeed9",
    color: "#8a5a12",
    border: "#f0d3a8",
    dot: "#c89a3f",
  },
};
