import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import PropertyForm from "@/features/properties/PropertyForm";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { listProperties, propertyTypes, type PropertyListInput, type PropertySort } from "@/lib/properties/properties";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const params = await searchParams;
  const input: PropertyListInput = {
    search: one(params.q), propertyType: one(params.type), status: one(params.status) as PropertyListInput["status"],
    city: one(params.city), serviceArea: one(params.serviceArea), upcoming: one(params.upcoming) === "1",
    openEstimate: one(params.openEstimate) === "1", recentlyServiced: one(params.recent) === "1",
    sort: one(params.sort) as PropertySort, page: Number(one(params.page)) || 1,
  };
  const [result, customers] = await Promise.all([
    listProperties(context.companyId, input),
    prisma.customer.findMany({ where: { companyId: context.companyId }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, phone: true }, take: 500 }),
  ]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize)), showCreate = one(params.new) === "1";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (key !== "page" && typeof value === "string" && value) query.set(key, value);
  const pageUrl = (page: number) => `/properties?${new URLSearchParams([...query, ["page", String(page)]]).toString()}`;
  return <AppLayout><div className="mx-auto max-w-7xl p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Properties</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage service locations linked to customers.</p></div><Link href={showCreate ? "/properties" : "/properties?new=1"} className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">+ New Property</Link></header>
    {showCreate && <div className="mt-5"><PropertyForm customers={customers} /></div>}
    <form className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4" aria-label="Property filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={input.search} placeholder="Search customer, address, city, ZIP, phone" aria-label="Search properties" className={control} />
        <select name="type" defaultValue={input.propertyType} className={control} aria-label="Property type"><option value="">All property types</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <select name="status" defaultValue={input.status} className={control} aria-label="Status"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select name="city" defaultValue={input.city} className={control} aria-label="City"><option value="">All cities</option>{result.cities.map((city) => <option key={city}>{city}</option>)}</select>
        <select name="serviceArea" defaultValue={input.serviceArea} className={control} aria-label="Service area"><option value="">All service areas</option>{result.serviceAreas.map((area) => <option key={area}>{area}</option>)}</select>
        <select name="sort" defaultValue={input.sort ?? "name_asc"} className={control} aria-label="Sort"><option value="name_asc">Property A–Z</option><option value="name_desc">Property Z–A</option><option value="customer_asc">Customer A–Z</option><option value="created_desc">Newest</option></select>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="upcoming" value="1" type="checkbox" defaultChecked={input.upcoming} /> Upcoming job</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="openEstimate" value="1" type="checkbox" defaultChecked={input.openEstimate} /> Open estimate</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="recent" value="1" type="checkbox" defaultChecked={input.recentlyServiced} /> Recently serviced</label>
      </div><div className="mt-3 flex gap-2"><button className="min-h-11 rounded-xl bg-slate-900 px-4 font-semibold text-white dark:bg-white dark:text-slate-950">Apply filters</button><Link href="/properties" className="inline-flex min-h-11 items-center rounded-xl border px-4">Clear</Link></div>
    </form>
    {result.total === 0 && !Object.values(input).some(Boolean) ? <section className="mt-6 rounded-2xl border border-dashed p-10 text-center"><h2 className="text-xl font-semibold">No properties yet</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Properties are service locations linked to customers.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/properties?new=1" className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white">Add Property</Link><Link href="/customers" className="inline-flex min-h-11 items-center rounded-xl border px-5 font-semibold">Create Customer</Link></div></section> : <>
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] md:block"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 dark:bg-slate-900"><tr>{["Property","Customer","Address","Type","Access","Open","Upcoming","Last service","Status","Actions"].map((heading) => <th className="p-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{result.properties.map((property) => <tr key={property.id} className="border-b last:border-0"><td className="p-3 font-medium">{property.nickname || "Service location"}</td><td className="p-3">{property.customer.firstName} {property.customer.lastName}</td><td className="p-3">{address(property)}</td><td className="p-3">{property.propertyType || "—"}</td><td className="p-3">{property.accessNotes || property.gateCode || property.hazardNotes ? "Notes" : "—"}</td><td className="p-3">{property.activeEstimateCount}</td><td className="p-3">{property.upcomingJobCount}</td><td className="p-3">{date(property.lastServiceDate)}</td><td className="p-3">{property.active ? "Active" : "Archived"}</td><td className="p-3"><Link href={`/properties/${property.id}`} className="inline-flex min-h-11 items-center font-semibold text-blue-700 dark:text-blue-300">View</Link></td></tr>)}</tbody></table></div>
      <div className="mt-6 grid gap-3 md:hidden">{result.properties.map((property) => <article key={property.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{property.nickname || "Service location"}</h2><p className="text-sm">{property.customer.firstName} {property.customer.lastName}</p></div><span className="rounded-full border px-2 py-1 text-xs">{property.active ? "Active" : "Archived"}</span></div><p className="mt-3 text-sm">{address(property)}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>{property.activeEstimateCount} open estimates</span><span>{property.upcomingJobCount} upcoming jobs</span><span>Last: {date(property.lastServiceDate)}</span><span>{property.propertyType || "No type"}</span></div><div className="mt-4 flex gap-2"><Link href={`/properties/${property.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-900 font-semibold text-white dark:bg-white dark:text-slate-950">View details</Link><a href={`tel:${property.customer.phone}`} aria-label={`Call ${property.customer.firstName} ${property.customer.lastName}`} className="inline-flex min-h-11 items-center rounded-xl border px-4">Call</a><a href={mapUrl(property)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border px-4">Navigate</a></div></article>)}</div>
      {result.properties.length === 0 && <p className="mt-6 rounded-2xl border border-dashed p-8 text-center">No properties match these filters.</p>}
    </>}
    <footer className="mt-5 flex items-center justify-between"><span className="text-sm text-slate-600 dark:text-slate-300">{result.total} properties</span><div className="flex gap-2">{input.page! > 1 && <Link href={pageUrl(input.page! - 1)} className="inline-flex min-h-11 items-center rounded-xl border px-4">Previous</Link>}{input.page! < pages && <Link href={pageUrl(input.page! + 1)} className="inline-flex min-h-11 items-center rounded-xl border px-4">Next</Link>}</div></footer>
  </div></AppLayout>;
}
const control = "min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3";
const address = (property: { address: string; addressLine2: string | null; city: string; state: string; zip: string }) => [property.address, property.addressLine2, `${property.city}, ${property.state} ${property.zip}`].filter(Boolean).join(", ");
const mapUrl = (property: Parameters<typeof address>[0]) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address(property))}`;
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value) : "Never";
