"use client";

import Link from "next/link";
import { useState } from "react";
import { createPropertyAction } from "@/app/actions/properties/createProperty";
import { updateCustomerAction } from "@/app/actions/customers/updateCustomer";
import { enablePortalAccessAction, revokePortalAccessAction, sendPortalLinkAction } from "@/app/actions/portal/portal";
import type { getCustomerDetail } from "@/lib/customers/getCustomerDetail";

type CustomerDetailData = NonNullable<
  Awaited<ReturnType<typeof getCustomerDetail>>
>;
const emptyProperty = {
  address: "",
  city: "",
  state: "",
  zip: "",
  gateCode: "",
  accessNotes: "",
};

export default function CustomerDetail({
  initialCustomer,
}: {
  initialCustomer: CustomerDetailData;
}) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email ?? "",
    notes: customer.notes ?? "",
  });
  const [property, setProperty] = useState(emptyProperty);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveCustomer() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setError("First name, last name, and phone are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateCustomerAction({ id: customer.id, ...form });
      setCustomer((current) => ({ ...current, ...updated }));
      setMessage("Customer saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save customer.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addProperty() {
    if (
      !property.address.trim() ||
      !property.city.trim() ||
      !property.state.trim() ||
      !property.zip.trim()
    ) {
      setError("Address, city, state, and ZIP are required.");
      return;
    }
    setIsCreatingProperty(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createPropertyAction({
        customerId: customer.id,
        ...property,
      });
      setCustomer((current) => ({
        ...current,
        properties: [...current.properties, created].sort((a, b) =>
          a.address.localeCompare(b.address),
        ),
      }));
      setProperty(emptyProperty);
      setShowPropertyForm(false);
      setMessage("Property saved.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create property.",
      );
    } finally {
      setIsCreatingProperty(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/customers" className="text-sm font-semibold text-blue-700">
        Back to Customers
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 text-slate-600">
            Customer profile and estimate history.
          </p>
        </div>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}
      <PortalAccess customer={customer} onUpdate={(access) => setCustomer(current => ({...current, portalAccesses:[access]}))} />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Customer information</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(firstName) =>
              setForm((current) => ({ ...current, firstName }))
            }
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(lastName) =>
              setForm((current) => ({ ...current, lastName }))
            }
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(phone) => setForm((current) => ({ ...current, phone }))}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(email) => setForm((current) => ({ ...current, email }))}
          />
        </div>
        <textarea
          aria-label="Notes"
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Notes"
          className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 p-3"
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveCustomer()}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
        >
          {isSaving ? "Saving..." : "Save Customer"}
        </button>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Service Plans</h2><Link href={`/service-plans/new?customer=${customer.id}`} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Create plan</Link></div><div className="mt-4 space-y-3">{customer.servicePlans.map((plan) => <Link href={`/service-plans/${plan.id}`} key={plan.id} className="block rounded-xl border p-4"><div className="flex justify-between"><strong>{plan.name}</strong><span>{plan.status}</span></div><p className="text-sm text-slate-600">Next service: {plan.nextRunAt ? new Date(plan.nextRunAt).toLocaleDateString() : "Not scheduled"} · {plan.jobs.length} recent generated job(s)</p></Link>)}{customer.servicePlans.length === 0 && <p className="text-slate-500">No service plans.</p>}</div></section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Properties</h2>
          <button
            type="button"
            onClick={() => setShowPropertyForm((current) => !current)}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
          >
            Add Another Property
          </button>
        </div>
        {showPropertyForm && (
          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <Input
              label="Address *"
              value={property.address}
              onChange={(address) =>
                setProperty((current) => ({ ...current, address }))
              }
            />
            <Input
              label="City *"
              value={property.city}
              onChange={(city) =>
                setProperty((current) => ({ ...current, city }))
              }
            />
            <Input
              label="State *"
              value={property.state}
              onChange={(state) =>
                setProperty((current) => ({ ...current, state }))
              }
            />
            <Input
              label="ZIP *"
              value={property.zip}
              onChange={(zip) =>
                setProperty((current) => ({ ...current, zip }))
              }
            />
            <Input
              label="Gate code"
              value={property.gateCode}
              onChange={(gateCode) =>
                setProperty((current) => ({ ...current, gateCode }))
              }
            />
            <Input
              label="Access notes"
              value={property.accessNotes}
              onChange={(accessNotes) =>
                setProperty((current) => ({ ...current, accessNotes }))
              }
            />
            <button
              type="button"
              disabled={isCreatingProperty}
              onClick={() => void addProperty()}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400"
            >
              {isCreatingProperty ? "Saving..." : "Save Property"}
            </button>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {customer.properties.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-semibold">{item.address}</p>
              <p className="text-sm text-slate-600">
                {item.city}, {item.state} {item.zip}
              </p>
            </div>
          ))}
          {customer.properties.length === 0 && (
            <p className="text-slate-500">No properties saved.</p>
          )}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Estimate history</h2>
        <div className="mt-4 space-y-3">
          {customer.estimates.map((estimate) => (
            <div
              key={estimate.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"
            >
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{estimate.property.address}</p>
                <p className="text-sm text-slate-600">
                  Updated {new Date(estimate.updatedAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                {estimate.status}
              </span>
              <p className="font-semibold">
                {formatCurrency(estimate.pricingTotal)}
              </p>
              <Link
                href={
                  estimate.status === "Draft"
                    ? `/estimates?estimateId=${estimate.id}`
                    : `/estimates/${estimate.id}`
                }
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
              >
                {estimate.status === "Draft" ? "Open" : "View"}
              </Link>
            </div>
          ))}
          {customer.estimates.length === 0 && (
            <p className="text-slate-500">No estimates saved.</p>
          )}
        </div>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Job history</h2><div className="mt-4 space-y-3">{customer.jobs.map(job=><Link href={`/jobs/${job.id}`} key={job.id} className="block rounded-xl border p-4"><strong>{job.jobNumber ?? "Job"}</strong><span className="float-right">{job.status}</span><p className="text-sm text-slate-600">{job.property.address} · {job.scheduledStart ? new Date(job.scheduledStart).toLocaleDateString() : "Unscheduled"}</p></Link>)}{!customer.jobs.length&&<p className="text-slate-500">No jobs.</p>}</div></div><div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Invoices & payments</h2><div className="mt-4 space-y-3">{customer.invoices.map(invoice=><Link href={`/invoices/${invoice.id}`} key={invoice.id} className="block rounded-xl border p-4"><strong>{invoice.displayNumber ?? "Invoice"}</strong><span className="float-right">{invoice.status}</span><p className="text-sm">{formatCurrency(invoice.total)} · Balance {formatCurrency(invoice.balanceDue)}</p>{invoice.payments.map(payment=><p key={payment.id} className="text-xs text-slate-600">{new Date(payment.paymentDate).toLocaleDateString()} · {payment.method} · {formatCurrency(payment.amount)}</p>)}</Link>)}{!customer.invoices.length&&<p className="text-slate-500">No invoices.</p>}</div></div></section>
    </div>
  );
}

function PortalAccess({customer,onUpdate}:{customer:CustomerDetailData;onUpdate:(access:CustomerDetailData["portalAccesses"][number])=>void}) {
  const access=customer.portalAccesses[0]; const[email,setEmail]=useState(access?.email??customer.email??""); const[busy,setBusy]=useState(false); const[status,setStatus]=useState<string|null>(null);
  async function enable(){setBusy(true);try{const next=await enablePortalAccessAction(customer.id,email);onUpdate(next);setStatus("Portal access enabled.");}finally{setBusy(false)}}
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Customer portal</h2><p className="mt-1 text-sm text-slate-600">Access is passwordless and can be revoked at any time.</p><div className="mt-4 flex flex-wrap gap-2"><input aria-label="Portal email" value={email} onChange={e=>setEmail(e.target.value)} className="min-w-64 rounded-lg border p-2"/><button disabled={busy||!email} onClick={()=>void enable()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">{access?"Update access":"Enable access"}</button>{access?.status==="Active"&&<button disabled={busy} onClick={()=>void sendPortalLinkAction(access.id).then(()=>setStatus("Sign-in link queued."))} className="rounded-lg border px-4 py-2">Send sign-in link</button>}{access?.status==="Active"&&<button disabled={busy} onClick={()=>void revokePortalAccessAction(access.id).then(next=>{onUpdate(next);setStatus("Portal access revoked.")})} className="rounded-lg border border-red-300 px-4 py-2 text-red-700">Revoke</button>}</div>{access&&<p className="mt-3 text-sm">Status: {access.status} · Last login: {access.lastLoginAt?new Date(access.lastLoginAt).toLocaleString():"Never"}</p>}{status&&<p className="mt-2 text-sm text-green-700">{status}</p>}</section>;
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-300 p-3"
    />
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
