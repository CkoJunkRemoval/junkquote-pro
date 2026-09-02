"use client";
import Link from "next/link";
import { useState } from "react";
import { updateInvoiceStatusAction } from "@/app/actions/invoices/updateInvoiceStatus";
import { downloadInvoicePdfAction } from "@/app/actions/invoices/downloadInvoicePdf";
import { downloadPdf } from "@/data/output/downloadPdf";
import {
  invoiceStatusTransitions,
  type InvoiceWorkflowStatus,
} from "@/lib/invoices/statusWorkflow";
import {
  getInvoicePaymentLinkAction,
  sendInvoiceAction,
  updateDraftInvoiceAction,
} from "@/app/actions/invoices/invoiceMutations";
import type { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
type InvoiceData = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );

export default function InvoiceDetail({
  initialInvoice,
}: {
  initialInvoice: InvoiceData;
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const invoiceLabel = invoice.displayNumber ?? `Invoice #${invoice.invoiceNumber}`;
  const companyName = invoice.company.displayName ?? invoice.company.name;
  const [recipient, setRecipient] = useState(invoice.customer.email ?? "");
  const [emailSubject, setEmailSubject] = useState(
    `${invoiceLabel} from ${companyName}`,
  );
  const [emailMessage, setEmailMessage] = useState("Your invoice is ready.");
  const [items, setItems] = useState(
    invoice.lineItems.map((x) => ({
      description: x.description,
      kind: x.kind,
      quantity: x.quantity,
      unitPrice: x.unitPrice,
    })),
  );
  const [tax, setTax] = useState(String(invoice.tax));
  const [discounts, setDiscounts] = useState(String(invoice.discounts));
  const [notes, setNotes] = useState(invoice.notes);
  async function setStatus(status: InvoiceWorkflowStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateInvoiceStatusAction(invoice.id, status);
      setInvoice((current) => ({ ...current, ...updated }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update invoice.");
    } finally {
      setSaving(false);
    }
  }
  async function send() {
    setSaving(true);
    setError(null);
    try {
      const result = await sendInvoiceAction(invoice.id, {
        recipient,
        subject: emailSubject,
        message: emailMessage,
      });
      if (!result.ok) {
        setError(`Delivery failed: ${result.error}`);
        return;
      }
      const updated = result.invoice;
      setInvoice((current) => ({ ...current, ...updated }));
      setMessage(`Invoice emailed to ${updated.lastSentTo}.`);
      setShowEmailForm(false);
    } catch (e) {
      setError(
        `Delivery failed: ${e instanceof Error ? e.message : "Unable to send invoice."}`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function copyPaymentLink() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await navigator.clipboard.writeText(await getInvoicePaymentLinkAction(invoice.id));
      setMessage("Payment link copied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to copy the payment link.");
    } finally {
      setSaving(false);
    }
  }
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDraftInvoiceAction(invoice.id, {
        lineItems: items,
        tax: Number(tax),
        discounts: Number(discounts),
        dueDate: invoice.dueDate,
        notes,
      });
      setInvoice((current) => ({ ...current, ...updated }));
      setMessage("Draft invoice saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save invoice.");
    } finally {
      setSaving(false);
    }
  }
  async function download() {
    try {
      downloadPdf(
        await downloadInvoicePdfAction(invoice.id),
        `invoice-${invoice.invoiceNumber}.pdf`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to download invoice PDF.",
      );
    }
  }
  const transitions =
    invoiceStatusTransitions[invoice.status as InvoiceWorkflowStatus];
  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/invoices" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700">
        Back to Invoices
      </Link>
      <div className="mt-3 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {invoice.displayNumber ?? `Invoice #${invoice.invoiceNumber}`}
          </h1>
          <p className="text-slate-600">
            {invoice.customer.firstName} {invoice.customer.lastName} ·{" "}
            {invoice.property.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setShowEmailForm(true);
            }}
            disabled={
              saving ||
              invoice.status === "Void" ||
              invoice.status === "Cancelled"
            }
            className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
          >
            {invoice.sentAt ? "Resend Invoice" : "Email Invoice"}
          </button>
          <button
            type="button"
            onClick={() => void copyPaymentLink()}
            disabled={saving}
            className="min-h-11 rounded-lg border px-4 py-2 font-semibold"
          >
            Copy Payment Link
          </button>
          <button
            type="button"
            onClick={() => void download()}
            className="min-h-11 rounded-lg border px-4 py-2 font-semibold"
          >
            Download PDF
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
      {message && <p role="status" className="mt-4 text-green-700">{message}</p>}
      {showEmailForm && (
        <section className="mt-6 rounded-2xl border border-green-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Review invoice email</h2>
              <p className="mt-1 text-sm text-slate-600">
                The current invoice PDF will be attached automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              disabled={saving}
              className="min-h-11 rounded-lg border px-4 py-2 font-semibold"
            >
              Cancel
            </button>
          </div>
          {!invoice.customer.email && (
            <p role="alert" className="mt-4 text-amber-800">
              This customer does not have an email address on file. Enter a recipient below.
            </p>
          )}
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 font-semibold">
              Recipient
              <input
                type="email"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="rounded-lg border p-3 font-normal"
                autoComplete="email"
              />
            </label>
            <label className="grid gap-1 font-semibold">
              Subject
              <input
                required
                maxLength={200}
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                className="rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-semibold">
              Message
              <textarea
                required
                maxLength={2000}
                value={emailMessage}
                onChange={(event) => setEmailMessage(event.target.value)}
                className="min-h-28 rounded-lg border p-3 font-normal"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={saving || !recipient.trim() || !emailSubject.trim() || !emailMessage.trim()}
            className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Sending..." : invoice.sentAt ? "Resend Invoice" : "Send Invoice"}
          </button>
        </section>
      )}
      <section className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Status</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="status-chip rounded-full px-3 py-2">
            {invoice.status === "Partial" ? "Partially Paid" : invoice.status}
          </span>
          {transitions
            .filter((x) => x !== "Sent")
            .map((status) => (
              <button
                key={status}
                disabled={saving}
                onClick={() => void setStatus(status)}
                className={`rounded-lg border px-4 py-2 ${status === "Void" ? "text-red-700" : status === "Overdue" ? "text-amber-800" : ""}`}
              >
                {status === "Void" ? "Void Invoice" : `Mark ${status}`}
              </button>
            ))}
        </div>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-bold">Customer & service</h2>
          <p className="mt-3 font-semibold">
            {invoice.customer.firstName} {invoice.customer.lastName}
          </p>
          <p>{invoice.customer.phone}</p>
          <p>{invoice.customer.email}</p>
          <p className="mt-3">
            {invoice.property.address}, {invoice.property.city},{" "}
            {invoice.property.state} {invoice.property.zip}
          </p>
          {invoice.job?.scheduledStart && (
            <p className="mt-3">
              Job date:{" "}
              {new Date(invoice.job.scheduledStart).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-bold">Totals</h2>
          <p className="mt-3">
            Subtotal{" "}
            <span className="float-right">{money(invoice.subtotal)}</span>
          </p>
          <p>
            Tax <span className="float-right">{money(invoice.tax)}</span>
          </p>
          <p>
            Discounts{" "}
            <span className="float-right">{money(invoice.discounts)}</span>
          </p>
          <p className="mt-2 border-t pt-2 text-lg font-bold">
            Total <span className="float-right">{money(invoice.total)}</span>
          </p>
          <p className="font-semibold">
            Balance due{" "}
            <span className="float-right">{money(invoice.balanceDue)}</span>
          </p>
          <p className="mt-2 text-sm">
            Due{" "}
            {invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString()
              : "on receipt"}
          </p>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Line items</h2>
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-2 md:grid-cols-[1fr_100px_140px_auto]"
            >
              {invoice.status === "Draft" ? (
                <>
                  <input
                    aria-label={`Description ${index + 1}`}
                    className="rounded border p-2"
                    value={item.description}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((x, i) =>
                          i === index
                            ? { ...x, description: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Quantity ${index + 1}`}
                    type="number"
                    className="rounded border p-2"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((x, i) =>
                          i === index
                            ? { ...x, quantity: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Price ${index + 1}`}
                    type="number"
                    step="0.01"
                    className="rounded border p-2"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((x, i) =>
                          i === index
                            ? { ...x, unitPrice: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      setItems((rows) => rows.filter((_, i) => i !== index))
                    }
                    className="text-red-700"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <span>{item.description}</span>
                  <span>{item.quantity}</span>
                  <span>{money(item.unitPrice)}</span>
                  <strong>{money(item.quantity * item.unitPrice)}</strong>
                </>
              )}
            </div>
          ))}
        </div>
        {invoice.status === "Draft" && (
          <>
            <button
              onClick={() =>
                setItems((rows) => [
                  ...rows,
                  {
                    description: "",
                    kind: "Service",
                    quantity: 1,
                    unitPrice: 0,
                  },
                ])
              }
              className="mt-3 rounded border px-3 py-2"
            >
              Add line
            </button>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                Tax
                <input
                  type="number"
                  step=".01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="ml-2 rounded border p-2"
                />
              </label>
              <label>
                Discounts
                <input
                  type="number"
                  step=".01"
                  value={discounts}
                  onChange={(e) => setDiscounts(e.target.value)}
                  className="ml-2 rounded border p-2"
                />
              </label>
            </div>
            <textarea
              aria-label="Invoice notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 min-h-24 w-full rounded border p-3"
            />
            <button
              disabled={saving}
              onClick={() => void save()}
              className="mt-3 rounded bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Save Draft
            </button>
          </>
        )}
      </section>
      <section className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">Timeline</h2>
        <ul className="mt-3 text-sm text-slate-600">
          <li>Created: {new Date(invoice.createdAt).toLocaleString()}</li>
          {invoice.sentAt && (
            <li>Sent: {new Date(invoice.sentAt).toLocaleString()}</li>
          )}
          {invoice.viewedAt && (
            <li>Viewed: {new Date(invoice.viewedAt).toLocaleString()}</li>
          )}
          {invoice.paidDate && (
            <li>Paid: {new Date(invoice.paidDate).toLocaleString()}</li>
          )}
          {invoice.voidedAt && (
            <li>Voided: {new Date(invoice.voidedAt).toLocaleString()}</li>
          )}
        </ul>
      </section>
    </div>
  );
}
