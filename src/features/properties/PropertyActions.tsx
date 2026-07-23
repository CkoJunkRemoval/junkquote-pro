"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archivePropertyAction, deletePropertyAction } from "@/app/actions/properties/manageProperties";

export default function PropertyActions({ propertyId, active, canDelete }: { propertyId: string; active: boolean; canDelete: boolean }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function archive() {
    if (!window.confirm(active ? "Archive this property? Existing history will be preserved." : "Reactivate this property?")) return;
    setBusy(true); setError("");
    try { await archivePropertyAction(propertyId, active); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update property."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm("Permanently delete this unused property? This cannot be undone.")) return;
    setBusy(true); setError("");
    try { await deletePropertyAction(propertyId); router.push("/properties"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete property."); } finally { setBusy(false); }
  }
  return <div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void archive()} className="min-h-11 rounded-xl border border-amber-500 px-4 font-semibold text-amber-800 dark:text-amber-300">{busy ? "Saving…" : active ? "Archive Property" : "Reactivate Property"}</button>{canDelete && <button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 rounded-xl border border-red-500 px-4 font-semibold text-red-700 dark:text-red-300">Delete Property</button>}</div>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
