import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

export default function DashboardPage() {
  return <AppLayout><div className="mx-auto max-w-6xl p-6 sm:p-10"><h1 className="text-3xl font-bold text-slate-900">Dashboard</h1><p className="mt-2 text-slate-600">Your JunkQuote Pro workspace.</p><div className="mt-8 grid gap-5 md:grid-cols-3"><Link href="/estimates" className="rounded-2xl bg-blue-600 p-6 text-white"><h2 className="text-xl font-bold">New Estimate</h2><p className="mt-2 text-blue-100">Create or resume an estimate.</p></Link><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Today</h2><p className="mt-2 text-slate-600">Manage estimates, jobs, and customers from the sidebar.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Quick access</h2><p className="mt-2 text-slate-600">Open Estimates to start a new quote.</p></div></div></div></AppLayout>;
}
