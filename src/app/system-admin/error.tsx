"use client";

export default function SystemAdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">System Administration is temporarily unavailable</h1><p className="my-4">No sensitive error details were displayed. Retry, then check the Error Center if the problem continues.</p><button className="rounded border px-4 py-2" onClick={reset}>Retry</button></main>;
}
