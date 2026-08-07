import Link from "next/link";

const STATS = [
  { n: "3", l: "Roles, one system" },
  { n: "4", l: "Stages in the session loop" },
  { n: "1", l: "Verified record per room" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-sidebar px-6 py-9 text-sidebar-foreground md:px-12 md:py-11">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-[rgba(233,197,106,0.4)]">
            <span className="font-heading text-[21px] font-semibold text-sidebar-primary">
              H
            </span>
          </div>
          <span className="text-xs font-semibold tracking-[.16em] text-sidebar-primary uppercase">
            University of Benin
          </span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-[9px] bg-sidebar-foreground px-5 py-2.5 text-[13.5px] font-semibold text-sidebar transition-transform hover:-translate-y-px"
        >
          Sign in
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="flex max-w-[760px] flex-1 flex-col justify-center gap-6 py-10">
        <div className="h-0.5 w-11 bg-sidebar-primary" />
        <h1 className="font-heading text-[34px] leading-[1.06] font-medium tracking-tight text-sidebar-foreground md:text-[52px]">
          The Hostel Asset &amp; Property Management System
        </h1>
        <p className="max-w-[52ch] text-[16px] leading-[1.75] text-sidebar-foreground/70">
          One verified record of every room, every asset, and every session
          across the University of Benin halls of residence — from the
          porter&apos;s first inventory to the student&apos;s sign-off and
          the end-of-session audit.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-6">
          {STATS.map((s) => (
            <div key={s.l} className="flex flex-col gap-1">
              <span className="font-heading text-[34px] leading-none font-medium text-sidebar-primary">
                {s.n}
              </span>
              <span className="text-[12.5px] tracking-[.03em] text-sidebar-foreground/60">
                {s.l}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-[rgba(233,197,106,0.14)] pt-5 text-[12.5px] text-sidebar-foreground/60">
        Directorate of Hostels · Session 2025 / 2026
      </div>
    </div>
  );
}
