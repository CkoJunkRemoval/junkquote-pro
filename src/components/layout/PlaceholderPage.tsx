import AppLayout from "./AppLayout";

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <AppLayout><div className="mx-auto max-w-4xl p-6 sm:p-10"><div className="rounded-2xl border border-slate-200 bg-white p-8"><p className="text-sm font-semibold text-blue-600">JunkQuote Pro</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1><p className="mt-3 max-w-2xl text-slate-600">{description}</p><div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">This area is ready for its next workflow.</div></div></div></AppLayout>;
}
