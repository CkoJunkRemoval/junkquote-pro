import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCustomerPortalContext } from "@/lib/portal/context";
import { getPortalEstimate } from "@/lib/portal/data";
import PortalPage from "@/features/portal/PortalPage";
import {
  respondToPortalEstimateFormAction,
  sendPortalMessageFormAction,
} from "@/app/actions/portal/portal";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const c = await getCustomerPortalContext();
  if (!c) redirect("/portal/sign-in");
  const { id } = await params,
    row = await getPortalEstimate(c.companyId, c.customerId, id),
    query = await searchParams;
  if (!row) notFound();
  const canRespond =
    ["Sent", "Viewed"].includes(row.status) &&
    !!row.approvalTokenExpiresAt &&
    row.approvalTokenExpiresAt > new Date() &&
    row.revisions.at(-1)?.id === row.id;
  return (
    <PortalPage company={c.company}>
      {query.confirmed && (
        <div className="mb-5 rounded-xl bg-green-50 p-4 font-semibold text-green-800">
          Your estimate was{" "}
          {query.confirmed === "approve" ? "approved" : "declined"}. A
          confirmation has been recorded.
        </div>
      )}
      <h1 className="text-3xl font-bold">{row.displayNumber ?? "Estimate"}</h1>
      <p>
        {row.property.address} · {row.status}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Expires {row.approvalTokenExpiresAt?.toLocaleString() ?? "—"}
      </p>
      <div className="mt-5 space-y-3">
        {row.jobSites.flatMap((site) =>
          site.items.map((item) => (
            <div key={item.id} className="rounded border bg-white p-3">
              {item.quantity} × {item.name}
              <span className="float-right">
                {item.priceOverride !== null
                  ? money(item.priceOverride * item.quantity)
                  : "Included"}
              </span>
            </div>
          )),
        )}
      </div>
      <div className="mt-5 rounded-xl border bg-white p-5">
        {row.breakdown.sections.map((section) => (
          <section className="mb-4" key={section.key}>
            <h2 className="font-semibold">{section.title}</h2>
            {section.lines.map((line) => (
              <p className="flex justify-between gap-4 py-1 text-sm" key={line.id}>
                <span>{line.quantity && line.quantity !== 1 ? `${line.quantity} × ` : ""}{line.label}</span>
                <span>{money(line.amount)}</span>
              </p>
            ))}
          </section>
        ))}
        <p className="flex justify-between border-t pt-3 text-xl font-bold">
          <span>Total</span>
          <span>{money(row.breakdown.grandTotal)}</span>
        </p>
      </div>
      {row.revisionPhotos.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold">Photos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {row.revisionPhotos.map((photo) => (
              <figure key={photo.id} className="rounded border bg-white p-2">
                <img
                  className="aspect-square w-full object-cover"
                  src={photo.thumbnailUrl ?? photo.fileUrl}
                  alt={photo.caption ?? photo.fileName}
                />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-bold">Revision history</h2>
        {row.revisions.map((revision) => (
          <Link
            className="mt-2 flex justify-between"
            href={`/portal/estimates/${revision.id}`}
            key={revision.id}
          >
            <span>
              {revision.displayNumber} · Revision {revision.revisionNumber}
            </span>
            <span>{revision.status}</span>
          </Link>
        ))}
      </section>
      {canRespond && (
        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <form
            action={respondToPortalEstimateFormAction.bind(null, row.id)}
            className="rounded-xl border bg-white p-5"
          >
            <h2 className="font-bold">Approve estimate</h2>
            <input type="hidden" name="response" value="approve" />
            <input
              className="mt-3 w-full rounded border p-2"
              name="customerName"
              placeholder="Your full name"
              required
            />
            <textarea
              className="mt-3 w-full rounded border p-2"
              name="signatureData"
              placeholder="Typed signature (optional)"
            />
            <label className="mt-3 flex gap-2 text-sm">
              <input type="checkbox" name="consent" required />I consent to the
              work and portal terms v1.
            </label>
            <button className="mt-4 rounded bg-green-700 px-4 py-2 text-white">
              Approve
            </button>
          </form>
          <form
            action={respondToPortalEstimateFormAction.bind(null, row.id)}
            className="rounded-xl border bg-white p-5"
          >
            <h2 className="font-bold">Decline estimate</h2>
            <input type="hidden" name="response" value="decline" />
            <input
              className="mt-3 w-full rounded border p-2"
              name="customerName"
              placeholder="Your full name"
              required
            />
            <textarea
              className="mt-3 w-full rounded border p-2"
              name="declineReason"
              placeholder="Reason (optional)"
            />
            <button className="mt-4 rounded border border-red-300 px-4 py-2 text-red-700">
              Decline
            </button>
          </form>
        </section>
      )}
      <form
        action={sendPortalMessageFormAction.bind(null, { estimateId: row.id })}
        className="mt-6 rounded-xl border bg-white p-5"
      >
        <h2 className="font-bold">Message the company</h2>
        <input
          className="mt-3 w-full rounded border p-2"
          name="subject"
          placeholder="Subject"
        />
        <textarea
          className="mt-3 w-full rounded border p-2"
          name="body"
          placeholder="Your message"
          required
        />
        <button className="mt-3 rounded bg-blue-700 px-4 py-2 text-white">
          Send message
        </button>
      </form>
    </PortalPage>
  );
}
