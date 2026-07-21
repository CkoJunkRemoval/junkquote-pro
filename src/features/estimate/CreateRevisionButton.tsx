"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEstimateRevisionAction } from "@/app/actions/estimates/createEstimateRevision";

export default function CreateRevisionButton({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function createRevision() {
    setBusy(true); setError(null);
    try {
      const revision = await createEstimateRevisionAction(estimateId);
      router.push(`/estimates?estimateId=${revision.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create revision.");
      setBusy(false);
    }
  }
  return <div><button type="button" disabled={busy} onClick={() => void createRevision()} className="rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Creating revision..." : "Create Revision"}</button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
