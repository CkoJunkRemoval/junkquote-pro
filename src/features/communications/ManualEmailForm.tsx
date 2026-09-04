"use client";

import { useActionState } from "react";
import {
  manualSendCommunicationAction,
  type ManualSendCommunicationState,
} from "@/app/actions/communications/communications";

const initialState: ManualSendCommunicationState = { ok: false, error: null };

export default function ManualEmailForm({ customers, manual, buttonClassName }: {
  customers: Array<{ id: string; firstName: string; lastName: string; email: string | null }>;
  manual: { customerId?: string; sourceType?: string; sourceId?: string };
  buttonClassName: string;
}) {
  const [state, action, pending] = useActionState(manualSendCommunicationAction, initialState);
  return <details open={Boolean(manual.customerId)}>
    <summary className={`${buttonClassName} cursor-pointer list-none`}>Manual email</summary>
    <form action={action} className="mt-2 grid min-w-80 gap-3 rounded-xl border bg-[var(--surface)] p-4">
      <input type="hidden" name="sourceType" value={manual.sourceType ?? "Customer"}/>
      <input type="hidden" name="sourceId" value={manual.sourceId ?? manual.customerId ?? ""}/>
      <label>Customer<select required name="customerId" defaultValue={manual.customerId ?? ""} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--surface)] px-3"><option value="">Select customer</option>{customers.map((row)=><option key={row.id} value={row.id}>{row.firstName} {row.lastName} · {row.email}</option>)}</select></label>
      <label>Subject<input required name="subject" maxLength={300} className="mt-1 min-h-11 w-full rounded-xl border px-3"/></label>
      <label>Message preview<textarea required name="body" maxLength={20000} className="mt-1 min-h-32 w-full rounded-xl border p-3"/></label>
      <p className="text-xs">Review the final recipient, subject, and message above before sending.</p>
      <button type="submit" disabled={pending} className={`${buttonClassName} bg-blue-700 text-white disabled:opacity-60`}>{pending ? "Sending..." : "Send email"}</button>
      {state.ok&&<p role="status" className="text-sm text-green-700">Email sent successfully.</p>}
      {state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  </details>;
}
