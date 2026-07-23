import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import PropertyActions from "@/features/properties/PropertyActions";
import PropertyForm from "@/features/properties/PropertyForm";
import { requireTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { getProperty, type PropertyInput } from "@/lib/properties/properties";

export default async function PropertyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const context = await requireTenantContext(), { id } = await params, { edit } = await searchParams;
  const property = await getProperty(context.companyId, id);
  if (!property) notFound();
  const canEdit = ["Owner", "Admin", "Manager", "Office"].includes(context.role);
  if (!canEdit) {
    const employee = await prisma.employee.findFirst({ where: { companyId: context.companyId, userId: context.user.id, status: "Active" }, select: { id: true, crewMembers: { select: { crewId: true } } } });
    const assigned = employee && await prisma.jobAssignment.findFirst({ where: { companyId: context.companyId, job: { propertyId: id }, OR: [{ employeeId: employee.id }, { crewId: { in: employee.crewMembers.map((row) => row.crewId) } }] }, select: { id: true } });
    if (!assigned) notFound();
  }
  const customers = canEdit ? await prisma.customer.findMany({ where: { companyId: context.companyId }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, phone: true }, take: 500 }) : [];
  const [activity, messages] = canEdit ? await Promise.all([
    prisma.auditEvent.findMany({ where: { companyId: context.companyId, entityType: "Property", entityId: id }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, eventType: true, createdAt: true } }),
    prisma.customerMessageThread.findMany({ where: { companyId: context.companyId, customerId: property.customerId, OR: [
      { estimateId: { in: property.estimates.map((row) => row.id) } }, { jobId: { in: property.jobs.map((row) => row.id) } }, { invoiceId: { in: property.invoices.map((row) => row.id) } },
    ] }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, subject: true, updatedAt: true } }),
  ]) : [[], []];
  const fullAddress = [property.address, property.addressLine2, `${property.city}, ${property.state} ${property.zip}`, property.country].filter(Boolean).join(", ");
  const related = property.estimates.length + property.jobs.length + property.invoices.length;
  const initial: PropertyInput = { customerId: property.customerId, nickname: property.nickname ?? "", propertyType: property.propertyType ?? "", address: property.address, addressLine2: property.addressLine2 ?? "", city: property.city, state: property.state, zip: property.zip, country: property.country, gateCode: property.gateCode ?? "", parkingNotes: property.parkingNotes ?? "", accessNotes: property.accessNotes ?? "", hazardNotes: property.hazardNotes ?? "", notes: property.notes ?? "", serviceArea: property.serviceArea ?? "", active: property.active };
  return <AppLayout><div className="mx-auto max-w-6xl p-4 sm:p-8">
    <Link href="/properties" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 dark:text-blue-300">← Properties</Link>
    <header className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{property.nickname || "Service location"}</h1><span className="rounded-full border px-2 py-1 text-xs">{property.active ? "Active" : "Archived"}</span></div><p className="mt-2">{fullAddress}</p></div>{canEdit && <div className="flex flex-wrap gap-2"><Link href={`/estimate?customerId=${property.customerId}&propertyId=${property.id}`} className={primary}>Create Estimate</Link><Link href={`/jobs?propertyId=${property.id}`} className={secondary}>Schedule Job</Link><Link href={`/properties/${id}?edit=1`} className={secondary}>Edit Property</Link></div>}</header>
    {edit === "1" && canEdit && <div className="mt-6"><PropertyForm customers={customers} initial={initial} propertyId={id} /></div>}
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Section title="Overview"><Info label="Customer" value={`${property.customer.firstName} ${property.customer.lastName}`} /><Info label="Phone" value={property.customer.phone} link={`tel:${property.customer.phone}`} /><Info label="Email" value={property.customer.email || "No email"} /><Info label="Property type" value={property.propertyType || "Not set"} /><Info label="Service area" value={property.serviceArea || "Not assigned"} /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue-700 dark:text-blue-300">Open navigation ↗</a></Section>
      <Section title="Access & safety"><Info label="Gate / access code" value={property.gateCode || "None"} /><Info label="Parking" value={property.parkingNotes || "No instructions"} /><Info label="Access instructions" value={property.accessNotes || "No instructions"} /><Info label="Hazards" value={property.hazardNotes || property.dangerousPets || "None noted"} /></Section>
      {canEdit && <Section title="Notes"><p className="whitespace-pre-wrap text-sm">{property.notes || property.hoaNotes || "No property notes."}</p></Section>}
    </div>
    {canEdit && <><div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Records title="Estimates" empty="No estimates for this property.">{property.estimates.map((estimate) => <Link key={estimate.id} href={`/estimates/${estimate.id}`} className="flex min-h-11 items-center justify-between border-b py-2 last:border-0"><span>{estimate.displayNumber || "Estimate"}</span><span className="text-sm">{estimate.status}</span></Link>)}</Records>
      <Records title="Jobs" empty="No jobs for this property.">{property.jobs.map((job) => <Link key={job.id} href={`/jobs/${job.id}`} className="flex min-h-11 items-center justify-between border-b py-2 last:border-0"><span>{job.jobNumber || "Job"}</span><span className="text-sm">{job.status}</span></Link>)}</Records>
      <Records title="Invoices" empty="No invoices for this property.">{property.invoices.map((invoice) => <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex min-h-11 items-center justify-between border-b py-2 last:border-0"><span>{invoice.displayNumber || `Invoice ${invoice.invoiceNumber}`}</span><span className="text-sm">{invoice.status}</span></Link>)}</Records>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3"><Records title="Photos" empty="No customer-visible photos.">{property.jobs.flatMap((job) => job.photos).map((photo) => <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center pr-4 text-sm font-semibold text-blue-700 dark:text-blue-300">{photo.fileName}</a>)}</Records><Records title="Messages" empty="No related messages.">{messages.map((thread) => <div key={thread.id} className="border-b py-2 text-sm last:border-0"><p className="font-medium">{thread.subject}</p><p className="text-xs text-slate-500">{formatDate(thread.updatedAt)}</p></div>)}</Records><Records title="Activity timeline" empty="No property activity yet.">{activity.map((event) => <div key={event.id} className="border-b py-2 text-sm last:border-0"><p className="font-medium">{event.eventType}</p><p className="text-xs text-slate-500">{formatDate(event.createdAt)}</p></div>)}</Records></div></>}
    {canEdit && <div className="mt-6"><PropertyActions propertyId={id} active={property.active} canDelete={related === 0} /></div>}
  </div></AppLayout>;
}
const primary = "inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 font-semibold text-white";
const secondary = "inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold";
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5"><h2 className="font-semibold">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>; }
function Records({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const has = Array.isArray(children) ? children.length > 0 : Boolean(children); return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5"><h2 className="font-semibold">{title}</h2><div className="mt-3">{has ? children : <p className="text-sm text-slate-600 dark:text-slate-300">{empty}</p>}</div></section>; }
function Info({ label, value, link }: { label: string; value: string; link?: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-sm">{link ? <a href={link} className="underline">{value}</a> : value}</dd></div>; }
const formatDate = (value: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value);
