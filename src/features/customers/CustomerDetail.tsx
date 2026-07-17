"use client";

import Link from "next/link";
import { useState } from "react";
import { createPropertyAction } from "@/app/actions/properties/createProperty";
import { updateCustomerAction } from "@/app/actions/customers/updateCustomer";
import type { getCustomerDetail } from "@/lib/customers/getCustomerDetail";

type CustomerDetailData = NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>;
const emptyProperty = { address: "", city: "", state: "", zip: "", gateCode: "", accessNotes: "" };

export default function CustomerDetail({ initialCustomer }: { initialCustomer: CustomerDetailData }) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [form, setForm] = useState({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, email: customer.email ?? "", notes: customer.notes ?? "" });
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
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const updated = await updateCustomerAction({ id: customer.id, ...form });
      setCustomer((current) => ({ ...current, ...updated }));
      setMessage("Customer saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save customer.");
    } finally { setIsSaving(false); }
  }

  async function addProperty() {
    if (!property.address.trim() || !property.city.trim() || !property.state.trim() || !property.zip.trim()) {
      setError("Address, city, state, and ZIP are required.");
      return;
    }
    setIsCreatingProperty(true); setError(null); setMessage(null);
    try {
      const created = await createPropertyAction({ customerId: customer.id, ...property });
      setCustomer((current) => ({ ...current, properties: [...current.properties, created].sort((a, b) => a.address.localeCompare(b.address)) }));
      setProperty(emptyProperty); setShowPropertyForm(false); setMessage("Property saved.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create property.");
    } finally { setIsCreatingProperty(false); }
  }

  return <div className="mx-auto max-w-6xl p-6 sm:p-10"><Link href="/customers" className="text-sm font-semibold text-blue-700">Back to Customers</Link><div className="mt-3 flex flex-wrap items-baseline justify-between gap-3"><div><h1 className="text-3xl font-bold">{customer.firstName} {customer.lastName}</h1><p className="mt-1 text-slate-600">Customer profile and estimate history.</p></div></div>
    {error && <p className="mt-4 text-red-600">{error}</p>}{message && <p className="mt-4 text-green-700">{message}</p>}
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Customer information</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="First name" value={form.firstName} onChange={(firstName) => setForm((current) => ({ ...current, firstName }))} /><Input label="Last name" value={form.lastName} onChange={(lastName) => setForm((current) => ({ ...current, lastName }))} /><Input label="Phone" value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} /><Input label="Email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} /></div><textarea aria-label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 p-3" /><button type="button" disabled={isSaving} onClick={() => void saveCustomer()} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400">{isSaving ? "Saving..." : "Save Customer"}</button></section>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Properties</h2><button type="button" onClick={() => setShowPropertyForm((current) => !current)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Add Another Property</button></div>{showPropertyForm && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Input label="Address *" value={property.address} onChange={(address) => setProperty((current) => ({ ...current, address }))} /><Input label="City *" value={property.city} onChange={(city) => setProperty((current) => ({ ...current, city }))} /><Input label="State *" value={property.state} onChange={(state) => setProperty((current) => ({ ...current, state }))} /><Input label="ZIP *" value={property.zip} onChange={(zip) => setProperty((current) => ({ ...current, zip }))} /><Input label="Gate code" value={property.gateCode} onChange={(gateCode) => setProperty((current) => ({ ...current, gateCode }))} /><Input label="Access notes" value={property.accessNotes} onChange={(accessNotes) => setProperty((current) => ({ ...current, accessNotes }))} /><button type="button" disabled={isCreatingProperty} onClick={() => void addProperty()} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400">{isCreatingProperty ? "Saving..." : "Save Property"}</button></div>}<div className="mt-4 space-y-3">{customer.properties.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold">{item.address}</p><p className="text-sm text-slate-600">{item.city}, {item.state} {item.zip}</p></div>)}{customer.properties.length === 0 && <p className="text-slate-500">No properties saved.</p>}</div></section>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Estimate history</h2><div className="mt-4 space-y-3">{customer.estimates.map((estimate) => <div key={estimate.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"><div className="min-w-48 flex-1"><p className="font-semibold">{estimate.property.address}</p><p className="text-sm text-slate-600">Updated {new Date(estimate.updatedAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{estimate.status}</span><p className="font-semibold">{formatCurrency(estimate.pricingTotal)}</p><Link href={estimate.status === "Draft" ? `/estimates?estimateId=${estimate.id}` : `/estimates/${estimate.id}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{estimate.status === "Draft" ? "Open" : "View"}</Link></div>)}{customer.estimates.length === 0 && <p className="text-slate-500">No estimates saved.</p>}</div></section>
  </div>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <input aria-label={label} placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-300 p-3" />; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
