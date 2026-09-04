"use client";

export default function InvoiceDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-10">
      <section className="rounded-2xl border border-red-200 bg-white p-6">
        <h1 className="text-2xl font-bold">We couldn&apos;t load this invoice.</h1>
        <p className="mt-2 text-slate-600">Please try again.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
