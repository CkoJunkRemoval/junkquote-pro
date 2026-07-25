"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

const sections = [
  ["Overview", "/settings/company"],
  ["Branding", "/settings/company/branding"],
  ["Locations", "/settings/company/locations"],
  ["Service Areas", "/settings/company/service-areas"],
  ["Documents", "/settings/company/documents"],
  ["Notifications", "/settings/company/notifications"],
  ["Operational Defaults", "/settings/company/defaults"],
  ["Permissions", "/settings/company/permissions"],
  ["Subscription", "/settings/company/subscription"],
] as const;

export default function CompanyHubShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
          Company Hub
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-slate-400">{description}</p>
        <nav aria-label="Company Hub" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {sections.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                pathname === href
                  ? "border-cyan-400 bg-cyan-500 text-slate-950"
                  : "border-slate-700 bg-slate-900 hover:border-cyan-500"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}

export function HubCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const Field = ({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) => (
  <label className="grid gap-1 text-sm font-semibold text-slate-300">
    {label}
    <input
      name={name}
      type={type}
      required={required}
      className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white"
    />
  </label>
);

export const Submit = ({ children }: { children: ReactNode }) => (
  <PendingButton>{children}</PendingButton>
);

function PendingButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      aria-busy={pending}
      className="min-h-11 rounded-xl bg-cyan-500 px-5 font-black text-slate-950 hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
