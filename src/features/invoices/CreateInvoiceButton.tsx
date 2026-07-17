"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/app/actions/invoices/createInvoice";

export default function CreateInvoiceButton({ estimateId, jobId }: { estimateId: string; jobId?: string }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  async function create() { setCreating(true); setError(null); try { const invoice = await createInvoiceAction({ estimateId, ...(jobId ? { jobId } : {}) }); router.push(`/invoices/${invoice.id}`); } catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create invoice."); } finally { setCreating(false); } }
  return <div><button type="button" disabled={creating} onClick={() => void create()} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">{creating ? "Generating Invoice..." : "Generate Invoice"}</button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
