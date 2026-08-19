"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import { setToken, dashboardPathForRole, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TypewriterText } from "@/components/TypewriterText";

const FOOTNOTE_TEXTS = [
  "No self-registration. Password resets are handled by the hostel office.",
  "The University of Benin was founded in 1970 and remains one of Nigeria's foremost citadels of learning.",
  "“Knowledge for Service” — the motto of the University of Benin.",
  "“Education is the most powerful weapon which you can use to change the world.” — Nelson Mandela",
  "Every mattress, bunk bed, and cupboard — tracked from move-in to move-out.",
  "UNIBEN's Ugbowo and Ekehuan campuses house thousands of resident students each session.",
];

interface LoginResponse {
  access_token: string;
  role: UserRole;
  full_name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwVisible, setPwVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(data.access_token);
      router.push(dashboardPathForRole(data.role));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* Brand panel */}
      <div className="flex flex-col gap-5 bg-sidebar px-7 py-8 text-sidebar-foreground md:w-[46%] md:px-11 md:py-10">
        <div className="flex items-center gap-3">
          <div className="flex size-8.5 items-center justify-center rounded-lg border border-[rgba(233,197,106,0.4)]">
            <span className="font-heading text-xl font-semibold text-sidebar-primary">
              H
            </span>
          </div>
          <span className="text-xs font-semibold tracking-[.16em] text-sidebar-primary uppercase">
            University of Benin
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-5 py-2">
          <div className="h-0.5 w-11 bg-sidebar-primary" />
          <h1 className="font-heading text-[32px] leading-[1.08] font-medium tracking-tight text-sidebar-foreground md:text-[42px]">
            Every asset.
            <br />
            Every room.
            <br />
            Accounted&nbsp;for.
          </h1>
          <p className="max-w-[34ch] text-[15px] leading-[1.7] text-sidebar-foreground/70">
            The Hostel Asset &amp; Property Management System. One verified
            record of every room, every session, across the halls of residence.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[12.5px] text-sidebar-foreground/60">
            <span className="size-1.5 rounded-full bg-[#5aa06f]" />
            Hostel Directorate · Session 2025/2026
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-sidebar-primary hover:text-[#f0d68a]"
          >
            About HAPMS
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-start justify-center bg-[#faf6ef] px-6 py-8 md:items-center md:p-10">
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-[360px] flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-[28px] font-medium tracking-tight text-foreground md:text-[30px]">
              Sign in
            </h2>
            <p className="text-[14.5px] leading-[1.6] text-muted-foreground">
              Use the credentials issued to you by the hostel office.
              You&apos;ll land on the right dashboard automatically.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold tracking-[.06em] text-[#6b5f67] uppercase"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-auto rounded-[9px] border-[#d8cebf] bg-card px-3.5 py-3 text-[15px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold tracking-[.06em] text-[#6b5f67] uppercase"
              >
                Password
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={pwVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-auto rounded-[9px] border-[#d8cebf] bg-card px-3.5 py-3 pr-11 text-[15px]"
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setPwVisible((v) => !v)}
                  className="absolute right-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="h-auto w-full gap-2 rounded-[9px] py-3.5 text-[15px] font-semibold shadow-[0_6px_18px_rgba(44,16,41,.22)]"
          >
            {submitting ? "Signing in…" : "Sign in"}
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Button>
          <div className="flex min-h-[3.2em] items-start justify-center">
            <TypewriterText
              texts={FOOTNOTE_TEXTS}
              className="text-center text-[12.5px] leading-[1.6] text-muted-foreground"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
