"use client";

import { useState } from "react";

import { respondToEstimateApprovalAction } from "@/app/actions/estimates/respondToEstimateApproval";
import type { PublicEstimateApproval } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import SignaturePad from "@/components/estimate/SignaturePad";
import { downloadSignedPublicEstimatePdfAction } from "@/app/actions/estimates/downloadSignedPublicEstimatePdf";
import { downloadPdf } from "@/data/output/downloadPdf";

export default function PublicEstimateApproval({
  token,
  estimate,
}: {
  token: string;
  estimate: PublicEstimateApproval;
}) {
  const [response, setResponse] = useState<"Approved" | "Declined" | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState("");

  async function respond(action: "approve" | "decline") {
    setIsResponding(true);
    setError(null);

    try {
      const result = await respondToEstimateApprovalAction(token, action, signerName, signatureData);
      setResponse(result.status as "Approved" | "Declined");
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to record your response."
      );
    } finally {
      setIsResponding(false);
    }
  }

  async function downloadSignedCopy() {
    try { downloadPdf(await downloadSignedPublicEstimatePdfAction(token), "signed-estimate.pdf"); }
    catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "Unable to download signed copy."); }
  }

  if (response || estimate.status === "Approved") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <h1 className="text-3xl font-bold text-green-900">Estimate Approved</h1>
          <p className="mt-3 text-green-800">Thank you. Your approval has been recorded.</p>
          <button type="button" onClick={() => void downloadSignedCopy()} className="mt-5 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white">Download Signed Copy</button>
          {error && <p className="mt-3 text-red-700">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-slate-900">
      <header className="rounded-2xl bg-slate-900 p-8 text-white">
        <h1 className="text-3xl font-bold">{estimate.company.name}</h1>
        {estimate.company.website && <p className="mt-2 text-slate-300">{estimate.company.website}</p>}
        {estimate.company.phone && <p className="mt-1 text-slate-300">{estimate.company.phone}</p>}
      </header>

      <section className="rounded-2xl border p-6">
        <p className="text-sm text-slate-500">Estimate for</p>
        <h2 className="text-2xl font-bold">{estimate.customerName}</h2>
        <p className="mt-3 text-slate-700">
          {estimate.propertyAddress.address}<br />
          {estimate.propertyAddress.city}, {estimate.propertyAddress.state} {estimate.propertyAddress.zip}
        </p>
        <p className="mt-4 text-sm font-medium text-slate-600">Current status: {estimate.status}</p>
      </section>

      <section className="space-y-4">
        {estimate.jobSites.map((jobSite) => (
          <div key={jobSite.name} className="rounded-2xl border p-6">
            <h2 className="text-xl font-bold">{jobSite.name}</h2>
            {jobSite.customerNotes && <p className="mt-2 text-slate-600">{jobSite.customerNotes}</p>}
            <ul className="mt-4 divide-y">
              {jobSite.items.map((item) => (
                <li key={`${jobSite.name}-${item.name}`} className="py-3">
                  <div className="flex justify-between gap-4"><span>{item.name}</span><strong>×{item.quantity}</strong></div>
                  {item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-bold">Estimate Summary</h2>
        <div className="mt-4 space-y-2 text-slate-700">
          <div className="flex justify-between"><span>Subtotal</span><span>${estimate.pricing.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Labor</span><span>${estimate.pricing.labor.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Disposal</span><span>${estimate.pricing.disposal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-${estimate.pricing.discount.toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-3 text-xl font-bold text-slate-900"><span>Total</span><span>${estimate.pricing.total.toFixed(2)}</span></div>
        </div>
      </section>

      {estimate.status === "Sent" ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-bold">Ready to respond?</h2>
          <p className="mt-2 text-slate-700">This link expires {estimate.approvalTokenExpiresAt.toLocaleString()}.</p>
          <div className="mt-4 space-y-3"><input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Signer full name" className="w-full rounded-lg border p-3" /><SignaturePad onChange={setSignatureData} /></div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={isResponding} onClick={() => void respond("approve")} className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
              Approve Estimate
            </button>
            <button type="button" disabled={isResponding} onClick={() => void respond("decline")} className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
              Decline Estimate
            </button>
          </div>
          {error && <p className="mt-3 text-red-700">{error}</p>}
        </section>
      ) : estimate.status === "Declined" ? (
        <section className="rounded-2xl border border-slate-200 p-6 text-center">This estimate has already been declined.</section>
      ) : null}
    </main>
  );
}
