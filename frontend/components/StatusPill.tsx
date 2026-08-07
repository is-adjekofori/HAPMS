import { PILL_STYLES, type PillKind } from "@/lib/pill";

interface StatusPillProps {
  kind: PillKind;
  /** Override the default label (e.g. "3 flagged" instead of "Flagged"). */
  label?: string;
  className?: string;
}

export function StatusPill({ kind, label, className }: StatusPillProps) {
  const s = PILL_STYLES[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-semibold ${className ?? ""}`}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.dot && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: s.dot }}
        />
      )}
      {label ?? s.label}
    </span>
  );
}
