"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard, ShieldX } from "lucide-react";

export const accessDeniedMessage =
  "You do not have permission to use this feature. Contact your manager or company administrator if you believe you need access.";

export default function AccessDenied() {
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-x-hidden px-4 py-10">
      <section
        aria-labelledby="access-denied-title"
        className="glass-card w-full max-w-xl border border-white/10 p-6 text-center shadow-2xl sm:p-10"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-300">
          <ShieldX aria-hidden="true" size={28} />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">
          Access denied
        </p>
        <h1 id="access-denied-title" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          This feature is restricted
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
          {accessDeniedMessage}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 outline-none hover:bg-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <LayoutDashboard aria-hidden="true" size={18} />
            Return to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-semibold text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Go Back
          </button>
        </div>
      </section>
    </main>
  );
}
