"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkDuplicatePropertyAction, createManagedPropertyAction, updateManagedPropertyAction,
} from "@/app/actions/properties/manageProperties";
import { createCustomerAction } from "@/app/actions/customers/createCustomer";
import { propertyTypes, type PropertyInput } from "@/lib/properties/propertyTypes";

type CustomerOption = { id: string; firstName: string; lastName: string; phone: string };
const empty: PropertyInput = { customerId: "", nickname: "", propertyType: "Residential", address: "", addressLine2: "", city: "", state: "", zip: "", country: "US", gateCode: "", parkingNotes: "", accessNotes: "", hazardNotes: "", notes: "", serviceArea: "", active: true };

export default function PropertyForm({ customers, initial, propertyId, onCancel }: { customers: CustomerOption[]; initial?: PropertyInput; propertyId?: string; onCancel?: () => void }) {
  const router = useRouter(), [options, setOptions] = useState(customers), [value, setValue] = useState(initial ?? empty), [error, setError] = useState(""), [warning, setWarning] = useState(""), [saving, setSaving] = useState(false), [addingCustomer, setAddingCustomer] = useState(false), [customer, setCustomer] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const change = (key: keyof PropertyInput, next: string | boolean) => setValue((current) => ({ ...current, [key]: next }));
  async function submit() {
    setSaving(true); setError("");
    try {
      const duplicate = await checkDuplicatePropertyAction(value, propertyId);
      if (duplicate) { setWarning(`A property already exists at ${duplicate.address}, ${duplicate.city}.`); return; }
      const saved = propertyId ? await updateManagedPropertyAction(propertyId, value) : await createManagedPropertyAction(value);
      router.push(`/properties/${saved.id}`); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save property."); }
    finally { setSaving(false); }
  }
  async function addCustomer() {
    setSaving(true); setError("");
    try {
      const created = await createCustomerAction(customer);
      const option = { id: created.id, firstName: created.firstName, lastName: created.lastName, phone: created.phone };
      setOptions((current) => [...current, option]); change("customerId", created.id); setAddingCustomer(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create customer."); }
    finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 sm:p-6">
    <h2 className="text-lg font-semibold">{propertyId ? "Edit Property" : "New Property"}</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Customer"><select value={value.customerId} onChange={(e) => change("customerId", e.target.value)} className={control} required><option value="">Select customer</option>{options.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName} · {customer.phone}</option>)}</select><button type="button" className="min-h-11 justify-self-start text-sm font-semibold text-blue-700 dark:text-blue-300" onClick={() => setAddingCustomer((current) => !current)}>+ Create customer inline</button></Field>
      {addingCustomer && <div className="grid gap-2 rounded-xl border p-3 sm:col-span-2 sm:grid-cols-4"><input aria-label="Customer first name" className={control} placeholder="First name" value={customer.firstName} onChange={(e) => setCustomer((current) => ({ ...current, firstName: e.target.value }))} /><input aria-label="Customer last name" className={control} placeholder="Last name" value={customer.lastName} onChange={(e) => setCustomer((current) => ({ ...current, lastName: e.target.value }))} /><input aria-label="Customer phone" className={control} placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer((current) => ({ ...current, phone: e.target.value }))} /><input aria-label="Customer email" className={control} placeholder="Email" value={customer.email} onChange={(e) => setCustomer((current) => ({ ...current, email: e.target.value }))} /><button type="button" disabled={saving} onClick={() => void addCustomer()} className="min-h-11 rounded-xl bg-slate-900 px-4 font-semibold text-white dark:bg-white dark:text-slate-950">Create Customer</button></div>}
      <Input label="Property label" value={value.nickname ?? ""} onChange={(v) => change("nickname", v)} />
      <Field label="Property type"><select value={value.propertyType ?? ""} onChange={(e) => change("propertyType", e.target.value)} className={control}>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
      <Input label="Service area / travel zone" value={value.serviceArea ?? ""} onChange={(v) => change("serviceArea", v)} />
      <Input label="Address line 1" value={value.address} onChange={(v) => change("address", v)} required />
      <Input label="Address line 2" value={value.addressLine2 ?? ""} onChange={(v) => change("addressLine2", v)} />
      <Input label="City" value={value.city} onChange={(v) => change("city", v)} required />
      <Input label="State" value={value.state} onChange={(v) => change("state", v)} required />
      <Input label="ZIP" value={value.zip} onChange={(v) => change("zip", v)} required />
      <Input label="Country" value={value.country ?? "US"} onChange={(v) => change("country", v)} required />
      <Input label="Gate / access code" value={value.gateCode ?? ""} onChange={(v) => change("gateCode", v)} />
      <Input label="Parking instructions" value={value.parkingNotes ?? ""} onChange={(v) => change("parkingNotes", v)} />
      <TextArea label="Access instructions" value={value.accessNotes ?? ""} onChange={(v) => change("accessNotes", v)} />
      <TextArea label="Hazard notes" value={value.hazardNotes ?? ""} onChange={(v) => change("hazardNotes", v)} />
      <div className="sm:col-span-2"><TextArea label="General notes" value={value.notes ?? ""} onChange={(v) => change("notes", v)} /></div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={value.active ?? true} onChange={(e) => change("active", e.target.checked)} /> Active property</label>
    </div>
    {warning && <div role="alert" className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">{warning}<button type="button" className="ml-3 underline" onClick={() => setWarning("")}>Review address</button></div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void submit()} disabled={saving || Boolean(warning)} className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{saving ? "Saving…" : "Save Property"}</button>{onCancel && <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl border px-5">Cancel</button>}</div>
  </section>;
}
const control = "min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-sm font-medium"><span>{label}</span>{children}</label>; }
function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <Field label={label}><input className={control} value={value} required={required} onChange={(e) => onChange(e.target.value)} /></Field>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><textarea className={`${control} min-h-24 py-2`} value={value} onChange={(e) => onChange(e.target.value)} /></Field>; }
