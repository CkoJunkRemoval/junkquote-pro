"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJobFromEstimateAction } from "@/app/actions/jobs/createJobFromEstimate";

export default function CreateJobButton({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function createJob() {
    setIsCreating(true); setError(null);
    try { const job = await createJobFromEstimateAction(estimateId); router.push(`/jobs/${job.id}`); }
    catch (createError) { setError(createError instanceof Error ? createError.message : "Unable to create job."); }
    finally { setIsCreating(false); }
  }

  return <div><button type="button" disabled={isCreating} onClick={() => void createJob()} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">{isCreating ? "Creating Job..." : "Create Job"}</button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
