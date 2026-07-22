"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <WifiOff className="text-amber-700" size={36} />
        <h1 className="mt-4 text-2xl font-bold">You’re offline</h1>
        <p className="mt-3 text-slate-600">
          Live estimates, customers, invoices, payments, and job status may be
          out of date. Only field work already stored intentionally on this
          device remains available after you sign in.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            {online ? "Reconnect" : "Try again"}
          </button>
          <Link
            href="/field"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
          >
            Open field queue
          </Link>
        </div>
      </section>
    </main>
  );
}
