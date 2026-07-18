"use client";

import { useEffect, useState } from "react";
import {
  addPaymentAction,
  deletePaymentAction,
  listInvoicePaymentsAction,
  refundPaymentAction,
  updatePaymentAction,
} from "@/app/actions/payments/payments";
import { downloadPaymentReceiptAction } from "@/app/actions/payments/downloadPaymentReceipt";
import { downloadPdf } from "@/data/output/downloadPdf";
import type { PaymentMethod } from "@/generated/prisma/client";

type Payment = Awaited<ReturnType<typeof listInvoicePaymentsAction>>[number];
const methods: PaymentMethod[] = [
  "Cash",
  "Check",
  "CreditCard",
  "DebitCard",
  "ACH",
  "CashApp",
  "ApplePay",
  "Other",
];
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );

export default function InvoicePayments({
  invoiceId,
  total,
  initialBalance,
}: {
  invoiceId: string;
  total: number;
  initialBalance: number;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState(initialBalance);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Check");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void listInvoicePaymentsAction(invoiceId)
      .then((next) => {
        if (active) setPayments(next);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load payments.",
          );
      });
    return () => {
      active = false;
    };
  }, [invoiceId]);

  function resetForm() {
    setEditing(null);
    setAmount("");
    setMethod("Check");
    setReferenceNumber("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setShowForm(false);
  }
  function edit(payment: Payment) {
    setEditing(payment);
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setReferenceNumber(payment.referenceNumber ?? "");
    setPaymentDate(new Date(payment.paymentDate).toISOString().slice(0, 10));
    setNotes(payment.notes);
    setShowForm(true);
  }
  async function save() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a positive payment amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        amount: numericAmount,
        method,
        referenceNumber,
        paymentDate: new Date(`${paymentDate}T12:00:00`),
        notes,
      };
      const result = editing
        ? await updatePaymentAction(editing.id, input)
        : await addPaymentAction(invoiceId, input);
      setBalance(result.invoiceState.balanceDue);
      setPayments(await listInvoicePaymentsAction(invoiceId));
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payment.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(payment: Payment) {
    if (!window.confirm("Delete this payment? This cannot be undone.")) return;
    setError(null);
    try {
      const result = await deletePaymentAction(payment.id);
      setPayments((current) =>
        current.filter((item) => item.id !== payment.id),
      );
      setBalance(result.invoiceState.balanceDue);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete payment.",
      );
    }
  }
  async function receipt(payment: Payment) {
    try {
      downloadPdf(
        await downloadPaymentReceiptAction(payment.id),
        `receipt-${payment.id}.pdf`,
      );
    } catch (receiptError) {
      setError(
        receiptError instanceof Error
          ? receiptError.message
          : "Unable to download receipt.",
      );
    }
  }
  async function refund(payment: Payment) { const remaining = payment.amount - payment.refunds.reduce((sum, row) => sum + row.amount, 0); const raw = window.prompt(`Refund amount (maximum ${money(remaining)})`); if (!raw) return; const amount = Number(raw); const reason = window.prompt("Refund reason (optional)") ?? ""; setError(null); try { const result = await refundPaymentAction(payment.id, { amount, reason, refundedAt: new Date() }); setBalance(result.invoiceState.balanceDue); setPayments(await listInvoicePaymentsAction(invoiceId)); } catch (refundError) { setError(refundError instanceof Error ? refundError.message : "Unable to record refund."); } }
  const amountPaid = total - balance;
  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Payments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Total {money(total)} · Paid {money(amountPaid)} · Remaining{" "}
            {money(balance)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
        >
          Record Payment
        </button>
      </div>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {showForm && (
        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-lg border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Method
            <select
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as PaymentMethod)
              }
              className="rounded-lg border p-2"
            >
              {methods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Reference number
            <input
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              className="rounded-lg border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Payment date
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="rounded-lg border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-lg border p-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
            >
              {saving ? "Saving..." : editing ? "Save Payment" : "Add Payment"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="mt-5 space-y-3">
        {payments.map((payment) => (
          <article
            key={payment.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"
          >
            <div className="min-w-40 flex-1">
              <p className="font-semibold">
                {money(payment.amount)} · {payment.method}
              </p>
              <p className="text-sm text-slate-600">
                {new Date(payment.paymentDate).toLocaleDateString()}
                {payment.referenceNumber
                  ? ` · Ref ${payment.referenceNumber}`
                  : ""}
              </p>
              {payment.notes && (
                <p className="mt-1 text-sm text-slate-600">{payment.notes}</p>
              )}
              {payment.refunds.length > 0 && <p className="mt-1 text-sm text-amber-700">Refunded {money(payment.refunds.reduce((sum, row) => sum + row.amount, 0))}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void refund(payment)}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-800"
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => edit(payment)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(payment)}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => void receipt(payment)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Receipt
              </button>
            </div>
          </article>
        ))}
        {payments.length === 0 && (
          <p className="text-slate-500">No payments recorded.</p>
        )}
      </div>
    </section>
  );
}
