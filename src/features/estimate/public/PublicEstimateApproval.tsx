"use client";

import { useState } from "react";
import { respondToEstimateApprovalAction } from "@/app/actions/estimates/respondToEstimateApproval";
import type { PublicEstimateApproval } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import SignaturePad from "@/components/estimate/SignaturePad";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { downloadSignedPublicEstimatePdfAction } from "@/app/actions/estimates/downloadSignedPublicEstimatePdf";
import { downloadPdf } from "@/data/output/downloadPdf";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );

export default function PublicEstimateApproval({
  token,
  estimate,
}: {
  token: string;
  estimate: PublicEstimateApproval;
}) {
  const [response, setResponse] = useState<"Approved" | "Declined" | null>(
    null,
  );
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const status = response ?? estimate.status;
  const awaitingResponse = status === "Sent" || status === "Viewed";
  const accent = estimate.company.primaryColor ?? "#166534";

  async function respond(action: "approve" | "decline") {
    setIsResponding(true);
    setError(null);
    try {
      const result = await respondToEstimateApprovalAction(
        token,
        action,
        signerName,
        signatureData,
      );
      setResponse(result.status as "Approved" | "Declined");
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to record your response.",
      );
    } finally {
      setIsResponding(false);
    }
  }

  async function downloadSignedCopy() {
    try {
      downloadPdf(
        await downloadSignedPublicEstimatePdfAction(token),
        "signed-estimate.pdf",
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download signed copy.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 [color-scheme:light] sm:px-6 sm:py-10">
      <article
        className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-t-4 border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        style={{ borderTopColor: accent }}
      >
        <header className="flex flex-col gap-5 border-b border-slate-200 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyLogo
              src={estimate.company.logoUrl}
              companyName={estimate.company.name}
              size={56}
              className="rounded-xl"
              fallbackClassName="rounded-xl"
            />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold sm:text-3xl">
                {estimate.company.name}
              </h1>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-x-4">
                {estimate.company.phone && (
                  <span>{estimate.company.phone}</span>
                )}
                {estimate.company.email && (
                  <span className="break-all">{estimate.company.email}</span>
                )}
                {estimate.company.website && (
                  <span className="break-all">{estimate.company.website}</span>
                )}
              </div>
            </div>
          </div>
          <p className="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Estimate
          </p>
        </header>

        <div className="space-y-6 p-4 sm:p-8">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Prepared for
                </p>
                <h2 className="mt-1 break-words text-2xl font-bold">
                  {estimate.customerName}
                </h2>
                <p className="mt-2 break-words text-slate-700">
                  {estimate.propertyAddress.address}
                  <br />
                  {estimate.propertyAddress.city},{" "}
                  {estimate.propertyAddress.state}{" "}
                  {estimate.propertyAddress.zip}
                </p>
              </div>
              <dl className="grid shrink-0 gap-2 text-sm sm:text-right">
                {estimate.estimateNumber && (
                  <div>
                    <dt className="font-semibold text-slate-600">
                      Estimate number
                    </dt>
                    <dd className="font-bold text-slate-950">
                      {estimate.estimateNumber}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold text-slate-600">
                    Estimate date
                  </dt>
                  <dd>{estimate.estimateDate.toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">
                    Valid through
                  </dt>
                  <dd>
                    {estimate.approvalTokenExpiresAt.toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Status</dt>
                  <dd className="font-bold">{status}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section
            aria-labelledby="job-areas-heading"
            className="text-slate-950"
          >
            <h2 id="job-areas-heading" className="text-xl font-bold">
              Job Areas &amp; Items
            </h2>
            <div className="mt-3 space-y-4">
              {estimate.jobSites.map((jobSite) => (
                <section
                  key={jobSite.name}
                  className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <h3 className="break-words text-lg font-bold">
                    {jobSite.name}
                  </h3>
                  {jobSite.customerNotes && (
                    <p className="mt-2 break-words text-sm text-slate-700">
                      {jobSite.customerNotes}
                    </p>
                  )}
                  <ul className="mt-3 divide-y divide-slate-200">
                    {jobSite.items.map((item) => (
                      <li
                        key={`${jobSite.name}-${item.name}`}
                        className="flex min-w-0 items-start justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <span className="break-words font-medium">
                            {item.name}
                          </span>
                          {item.notes && (
                            <p className="mt-1 break-words text-sm text-slate-600">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <strong
                          className="shrink-0"
                          aria-label={`Quantity ${item.quantity}`}
                        >
                          ×{item.quantity}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950 sm:p-6">
            <h2 className="text-xl font-bold">Pricing Breakdown</h2>
            <div className="mt-4 space-y-5">
              {estimate.breakdown.sections.map((section) => (
                <section key={section.key}>
                  <h3 className="font-bold text-slate-900">{section.title}</h3>
                  <div className="mt-1 divide-y divide-slate-200">
                    {section.lines.map((line) => (
                      <div
                        className="flex min-h-11 items-start justify-between gap-4 py-3 text-sm"
                        key={line.id}
                      >
                        <span className="min-w-0 break-words">
                          {line.quantity && line.quantity !== 1
                            ? `${line.quantity} × `
                            : ""}
                          {line.label}
                        </span>
                        <span className="shrink-0 font-medium">
                          {money(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <div className="flex items-end justify-between gap-4 border-t-2 border-slate-300 pt-5 text-2xl font-extrabold">
                <span>Total</span>
                <span className="shrink-0 text-green-800">
                  {money(estimate.breakdown.grandTotal)}
                </span>
              </div>
            </div>
          </section>

          {awaitingResponse ? (
            <section
              className="scroll-mt-4 rounded-2xl border-2 border-green-700 bg-green-50 p-5 text-slate-950 sm:p-7"
              aria-labelledby="approval-heading"
            >
              <h2 id="approval-heading" className="text-2xl font-bold">
                Ready to move forward?
              </h2>
              <p className="mt-2 text-slate-700">
                Review and sign this estimate, then record your decision.
              </p>
              <label
                className="mt-5 block font-semibold"
                htmlFor="public-estimate-signer"
              >
                Signer full name
              </label>
              <input
                id="public-estimate-signer"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                autoComplete="name"
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300"
              />
              <div className="mt-5">
                <p className="mb-2 font-semibold">Draw your signature</p>
                <SignaturePad onChange={setSignatureData} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => void respond("approve")}
                  className="min-h-12 w-full rounded-xl bg-green-700 px-5 py-3 text-base font-bold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 disabled:bg-slate-500"
                >
                  {isResponding
                    ? "Recording response..."
                    : "Review & Sign Estimate"}
                </button>
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => void respond("decline")}
                  className="min-h-12 w-full rounded-xl border-2 border-slate-400 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:text-slate-500"
                >
                  Decline Estimate
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-4 font-medium text-red-800">
                  {error}
                </p>
              )}
            </section>
          ) : status === "Approved" ? (
            <section
              role="status"
              className="rounded-2xl border-2 border-green-700 bg-green-50 p-6 text-center text-slate-950"
            >
              <h2 className="text-2xl font-bold text-green-900">
                Estimate Approved
              </h2>
              <p className="mt-2 text-green-900">
                Thank you. Your approval has been recorded.
              </p>
              <button
                type="button"
                onClick={() => void downloadSignedCopy()}
                className="mt-5 min-h-12 w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 sm:w-auto"
              >
                Download Signed Copy
              </button>
              {error && (
                <p role="alert" className="mt-3 text-red-800">
                  {error}
                </p>
              )}
            </section>
          ) : status === "Declined" ? (
            <section
              role="status"
              className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-center text-slate-950"
            >
              <h2 className="text-xl font-bold">Estimate Declined</h2>
              <p className="mt-2">Your response has been recorded.</p>
            </section>
          ) : (
            <section
              role="status"
              className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-center text-slate-950"
            >
              <h2 className="text-xl font-bold">Estimate Finalized</h2>
              <p className="mt-2">This estimate is read-only.</p>
            </section>
          )}
        </div>
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs text-slate-600">
          Powered by JunkQuote Pro
        </footer>
      </article>
    </main>
  );
}
