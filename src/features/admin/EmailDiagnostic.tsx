"use client";
import { useState } from "react";
import { sendEmailDiagnosticAction } from "@/app/actions/admin/emailDiagnostic";
export default function EmailDiagnostic() {
  const [to, setTo] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const value = await sendEmailDiagnosticAction(to);
      setResult(`Sent successfully. Request ID: ${value.requestId}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Diagnostic failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-xl rounded-xl border bg-white p-6"
    >
      <h1 className="text-2xl font-bold">Production email diagnostic</h1>
      <p className="mt-2 text-sm text-slate-600">
        The address is used only for this test and is not saved as customer
        data.
      </p>
      <label className="mt-5 grid gap-1">
        Test recipient
        <input
          required
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border p-2"
        />
      </label>
      <button
        disabled={busy}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        {busy ? "Sending…" : "Send diagnostic"}
      </button>
      {result && (
        <p role="status" className="mt-4 rounded bg-slate-100 p-3">
          {result}
        </p>
      )}
    </form>
  );
}
