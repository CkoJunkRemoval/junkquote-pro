"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAction } from "@/app/actions/customers/createCustomer";
import { listCustomersAction } from "@/app/actions/customers/listCustomers";

type CustomerListResult = Awaited<ReturnType<typeof listCustomersAction>>;
type CustomerSort = "name_asc" | "name_desc" | "created_desc" | "created_asc" | "estimate_count_desc";

const emptyCustomer = { firstName: "", lastName: "", phone: "", email: "" };

export default function CustomerManagement({ initialSearch = "" }: { initialSearch?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<CustomerSort>("name_asc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CustomerListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let active = true;
    void listCustomersAction({ search, sort, page })
      .then((next) => {
        if (active) {
          setError(null);
          setResult(next);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
      });
    return () => { active = false; };
  }, [page, search, sort]);

  async function createCustomer() {
    if (!customer.firstName.trim() || !customer.lastName.trim() || !customer.phone.trim()) {
      setError("First name, last name, and phone are required.");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const created = await createCustomerAction(customer);
      router.push(`/customers/${created.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create customer.");
    } finally {
      setIsCreating(false);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Customers</h1><p className="mt-1 text-slate-600">Manage customer details, properties, and estimate history.</p></div>
        <button type="button" onClick={() => setShowCreate((current) => !current)} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">New Customer</button>
      </div>

      {showCreate && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">New Customer</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input placeholder="First name *" value={customer.firstName} onChange={(firstName) => setCustomer((current) => ({ ...current, firstName }))} /><Input placeholder="Last name *" value={customer.lastName} onChange={(lastName) => setCustomer((current) => ({ ...current, lastName }))} /><Input placeholder="Phone *" value={customer.phone} onChange={(phone) => setCustomer((current) => ({ ...current, phone }))} /><Input placeholder="Email" value={customer.email} onChange={(email) => setCustomer((current) => ({ ...current, email }))} /></div><div className="mt-4 flex gap-3"><button type="button" disabled={isCreating} onClick={() => void createCustomer()} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:bg-slate-400">{isCreating ? "Creating..." : "Create Customer"}</button><button type="button" disabled={isCreating} onClick={() => { setShowCreate(false); setCustomer(emptyCustomer); }} className="rounded-lg border border-slate-300 px-4 py-2">Cancel</button></div></section>}

      <div className="mt-6 flex flex-wrap gap-3"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, phone, or email" className="min-w-64 flex-1 rounded-xl border border-slate-300 p-3" /><select value={sort} onChange={(event) => { setSort(event.target.value as CustomerSort); setPage(1); }} className="rounded-xl border border-slate-300 p-3"><option value="name_asc">Name A-Z</option><option value="name_desc">Name Z-A</option><option value="created_desc">Newest</option><option value="created_asc">Oldest</option><option value="estimate_count_desc">Most estimates</option></select></div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      <div className="mt-6 space-y-3">{result?.customers.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-52 flex-1"><h2 className="font-semibold">{item.firstName} {item.lastName}</h2><p className="text-sm text-slate-600">{item.phone}</p><p className="text-sm text-slate-600">{item.email || "No email"}</p></div><div className="text-sm text-slate-600"><p>{item.propertyCount} properties</p><p>{item.estimateCount} estimates</p><p className="mt-1 text-xs">Latest: {item.latestEstimateAt ? new Date(item.latestEstimateAt).toLocaleString() : "No estimates"}</p></div><Link href={`/customers/${item.id}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">View</Link></article>)}{result && result.customers.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">No customers found.</div>}</div>
      <div className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-500">{result?.total ?? 0} customers</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Next</button></div></div>
    </div>
  );
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
  return <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-300 p-3" />;
}
