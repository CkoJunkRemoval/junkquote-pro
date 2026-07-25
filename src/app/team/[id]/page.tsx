import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  addCompensationAction,
  addCredentialAction,
  addEmergencyContactAction,
  addOnboardingItemAction,
  completeOnboardingItemAction,
  linkApplicationUserAction,
  prepareWorkforceInvitationAction,
  transitionWorkforceStatusAction,
  unlinkApplicationUserAction,
  updateWorkforceMemberAction,
  uploadWorkforceDocumentAction,
} from "@/app/actions/workforce/workforce";
import { WorkforceForm } from "@/features/workforce/WorkforceForm";
import { requireTenantContext } from "@/lib/auth/tenant";
import { hasWorkforceCapability, requireWorkforceCapability } from "@/lib/workforce/permissions";
import {
  getWorkforceActivity,
  getWorkforceDetail,
  getWorkforceFormOptions,
  listLinkableCompanyUsers,
} from "@/lib/workforce/service";

const field = "min-h-11 rounded-xl border px-3 py-2";
const button = "ui-button ui-button--primary rounded-xl px-4 py-3 font-semibold";

export default async function TeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section = "overview" } = await searchParams;
  const c = await requireTenantContext();
  requireWorkforceCapability(c.role, "workforce.view");
  const canCompensation = hasWorkforceCapability(c.role, "workforce.compensation.view");
  const canManageCompensation = hasWorkforceCapability(c.role, "workforce.compensation.manage");
  const canManage = hasWorkforceCapability(c.role, "workforce.manage");
  const canDocuments = hasWorkforceCapability(c.role, "workforce.documents.view");
  const canManageDocuments = hasWorkforceCapability(c.role, "workforce.documents.manage");
  const [member, options, users, activity] = await Promise.all([
    getWorkforceDetail(c.companyId, id, canCompensation),
    getWorkforceFormOptions(c.companyId, id),
    canManage ? listLinkableCompanyUsers(c.companyId) : [],
    getWorkforceActivity(c.companyId, id),
  ]);
  if (!member) notFound();
  const sections = ["overview","employment",...(canCompensation?["compensation"]:[]),"emergency","credentials",...(canDocuments?["documents"]:[]),"onboarding","activity"];
  const money = (cents: number | null) => cents == null ? "—" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

  return <AppLayout><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
    <Link href="/team" className="inline-flex min-h-11 items-center text-blue-300">← Team directory</Link>
    <div className="glass-card mt-3 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--brand-orange)]">{member.employeeNumber || "Team member"}</p><h1 className="text-3xl font-bold">{member.preferredName || member.firstName} {member.lastName}</h1><p className="mt-1 text-slate-400">{member.jobTitle || member.role} · {member.workerType}</p></div><span className="status-chip rounded-full px-4 py-2">{member.status}</span></div></div>
    <nav aria-label="Team member sections" className="mt-5 flex gap-2 overflow-x-auto pb-2">{sections.map(value=><Link key={value} href={`/team/${id}?section=${value}`} aria-current={section===value?"page":undefined} className={`filter-pill whitespace-nowrap rounded-full px-4 py-2 capitalize ${section===value?"filter-pill--active":""}`}>{value}</Link>)}</nav>

    {section==="overview" && <div className="mt-5 grid gap-5 lg:grid-cols-2"><Section title="Contact"><Info label="Legal name" value={[member.firstName,member.middleName,member.lastName].filter(Boolean).join(" ")} /><Info label="Email" value={member.email||"Not provided"} /><Info label="Phone" value={member.phone||"Not provided"} /><Info label="Address" value={[member.addressLine1,member.city,member.state,member.postalCode].filter(Boolean).join(", ")||"Not provided"} /></Section><Section title="At a glance"><Info label="Manager" value={member.manager?`${member.manager.firstName} ${member.manager.lastName}`:"Not assigned"} /><Info label="Default crew" value={member.defaultCrew?.name||"Not assigned"} /><Info label="Driver" value={member.authorizedDriver?"Authorized":"Not authorized"} /><Info label="Login access" value={member.user?`${member.user.email} · ${member.user.active?"Active":"Inactive"}`:member.invitationStatus} /></Section></div>}

    {section==="employment" && <div className="mt-5 space-y-5">{canManage && <WorkforceForm action={updateWorkforceMemberAction.bind(null,id)} member={member} managers={options.managers} crews={options.crews} submitLabel="Save workforce profile" />}<Section title="Employment status"><form action={transitionWorkforceStatusAction.bind(null,id)} className="grid gap-3 sm:grid-cols-3"><select name="status" defaultValue={member.status} className={field}>{["Onboarding","Active","Leave","Suspended","Terminated","Inactive"].map(x=><option key={x}>{x}</option>)}</select><input name="reason" placeholder="Reason when applicable" className={field}/><button className={button}>Update status</button></form><p className="mt-3 text-sm text-slate-400">Status changes preserve assignments, compensation, documents, and application identity.</p></Section><Section title="Application access">{member.user?<form action={unlinkApplicationUserAction.bind(null,id)}><p className="mb-3">{member.user.email} is linked. Removing access does not delete employment history.</p><button className="ui-button ui-button--danger rounded-xl px-4 py-3 font-semibold">Unlink application user</button></form>:<div className="grid gap-5 lg:grid-cols-2"><form action={linkApplicationUserAction.bind(null,id)} className="grid gap-3"><h3 className="font-semibold">Link existing company user</h3><select name="userId" className={field} required><option value="">Choose user</option>{users.map(user=><option key={user.id} value={user.id}>{user.email} · {user.memberships[0]?.role}</option>)}</select><button className={button}>Link user</button></form><form action={prepareWorkforceInvitationAction.bind(null,id)} className="grid gap-3"><h3 className="font-semibold">Prepare new-user invitation</h3><select name="role" className={field}><option value="Crew">Crew</option><option value="Office">Office</option><option value="Manager">Manager</option></select><button className={button}>Prepare invitation</button><p className="text-xs text-slate-400">Preparation does not create an account or grant elevated access.</p></form></div>}</Section></div>}

    {section==="compensation" && canCompensation && <div className="mt-5 space-y-5"><Section title="Compensation history">{member.compensationHistory.map(row=><div key={row.id} className="mt-3 grid gap-2 rounded-xl border p-4 sm:grid-cols-4"><strong>{row.compensationType}</strong><span>{money(row.hourlyRateCents)} hourly</span><span>{money(row.annualSalaryCents)} annual</span><span>{row.effectiveStartDate.toLocaleDateString()} – {row.effectiveEndDate?.toLocaleDateString()||"Current"}</span></div>)}{!member.compensationHistory.length&&<p className="text-slate-400">No compensation records.</p>}</Section>{canManageCompensation&&<Section title="Add compensation record"><form action={addCompensationAction.bind(null,id)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select name="compensationType" className={field}>{["Hourly","Salary","Commission","Mixed","OwnerDraw","Unpaid"].map(x=><option key={x}>{x}</option>)}</select><input name="hourlyRate" type="number" min="0" step=".01" placeholder="Hourly rate" className={field}/><input name="annualSalary" type="number" min="0" step=".01" placeholder="Annual salary" className={field}/><input name="effectiveStartDate" type="date" required className={field}/><input name="effectiveEndDate" type="date" className={field}/><label className="flex min-h-11 items-center gap-2"><input name="overtimeEligible" type="checkbox"/> Overtime eligible</label><input name="notes" placeholder="Restricted notes" className={field}/><button className={button}>Add compensation</button></form></Section>}</div>}

    {section==="emergency" && <div className="mt-5 space-y-5"><Section title="Emergency contacts">{member.emergencyContacts.map(contact=><div key={contact.id} className="mt-3 rounded-xl border p-4"><strong>{contact.priority}. {contact.name}</strong><p>{contact.relationship} · {contact.phone}</p></div>)}{!member.emergencyContacts.length&&<p className="text-slate-400">No emergency contacts.</p>}</Section>{canManage&&<Section title="Add emergency contact"><form action={addEmergencyContactAction.bind(null,id)} className="grid gap-3 sm:grid-cols-3"><input name="name" required placeholder="Name" className={field}/><input name="relationship" required placeholder="Relationship" className={field}/><input name="phone" required placeholder="Phone" className={field}/><input name="alternatePhone" placeholder="Alternate phone" className={field}/><input name="priority" type="number" min="1" defaultValue="1" className={field}/><input name="notes" placeholder="Restricted notes" className={field}/><button className={button}>Add contact</button></form></Section>}</div>}

    {section==="credentials" && <div className="mt-5 space-y-5"><Section title="Credentials">{member.workforceCredentials.map(item=><div key={item.id} className="mt-3 flex flex-wrap justify-between gap-3 rounded-xl border p-4"><span><strong>{item.title}</strong><small className="block text-slate-400">{item.type} · {item.issuingOrganization||"Issuer not listed"}</small></span><span className="status-chip rounded-full px-3 py-1">{item.status} · {item.expirationDate?.toLocaleDateString()||"No expiration"}</span></div>)}{!member.workforceCredentials.length&&<p className="text-slate-400">No credentials.</p>}</Section>{hasWorkforceCapability(c.role,"workforce.credentials.manage")&&<Section title="Add credential"><form action={addCredentialAction.bind(null,id)} className="grid gap-3 sm:grid-cols-3"><input name="type" required placeholder="Type" className={field}/><input name="title" required placeholder="Title" className={field}/><input name="identifier" placeholder="Identifier" className={field}/><input name="issuingOrganization" placeholder="Issuing organization" className={field}/><input name="issuedDate" type="date" className={field}/><input name="expirationDate" type="date" className={field}/><input name="notes" placeholder="Notes" className={field}/><button className={button}>Add credential</button></form></Section>}</div>}

    {section==="documents" && canDocuments && <div className="mt-5 space-y-5"><Section title="Private documents">{member.workforceDocuments.filter(doc=>canCompensation||!["Payroll","Tax"].includes(doc.category)).map(doc=><a key={doc.id} href={`/api/private/assets/${doc.storageKey}`} className="mt-3 flex min-h-11 items-center justify-between rounded-xl border p-4"><span><strong>{doc.displayFilename}</strong><small className="block text-slate-400">{doc.category} · {Math.ceil(doc.sizeBytes/1024)} KB</small></span><span>Download</span></a>)}{!member.workforceDocuments.length&&<p className="text-slate-400">No documents.</p>}</Section>{canManageDocuments&&<Section title="Upload private document"><form action={uploadWorkforceDocumentAction.bind(null,id)} className="grid gap-3 sm:grid-cols-2" encType="multipart/form-data"><input name="file" type="file" required className={field}/><select name="category" className={field}>{["Onboarding","PolicyAcknowledgment","Certification","DriverDocument",...(canManageCompensation?["Payroll","Tax"]:[]),"Performance","Disciplinary","Other"].map(x=><option key={x}>{x}</option>)}</select><input name="effectiveDate" type="date" className={field}/><input name="expirationDate" type="date" className={field}/><input name="notes" placeholder="Notes" className={field}/><button className={button}>Upload document</button></form></Section>}</div>}

    {section==="onboarding" && <div className="mt-5 space-y-5"><Section title="Onboarding checklist">{member.onboardingItems.map(item=><div key={item.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><span><strong>{item.title}</strong><small className="block text-slate-400">{item.category} · {item.required?"Required":"Optional"}</small></span>{item.status==="Completed"?<span className="status-chip rounded-full px-3 py-1">Completed</span>:<form action={completeOnboardingItemAction.bind(null,item.id)}><button className={button}>Mark complete</button></form>}</div>)}</Section>{hasWorkforceCapability(c.role,"workforce.onboarding.manage")&&<Section title="Add checklist item"><form action={addOnboardingItemAction.bind(null,id)} className="grid gap-3 sm:grid-cols-3"><input name="title" required placeholder="Checklist title" className={field}/><input name="category" required placeholder="Category" className={field}/><input name="dueDate" type="date" className={field}/><label className="flex min-h-11 items-center gap-2"><input name="required" type="checkbox" defaultChecked/> Required</label><input name="notes" placeholder="Notes" className={field}/><button className={button}>Add item</button></form></Section>}</div>}

    {section==="activity" && <Section title="Workforce activity" className="mt-5">{activity.map(event=><div key={event.id} className="mt-3 border-b border-white/10 pb-3"><strong>{event.eventType.replaceAll("."," ")}</strong><p className="text-sm text-slate-400">{event.createdAt.toLocaleString()} · {event.actingUser?.email||"System"}</p></div>)}{!activity.length&&<p className="text-slate-400">No workforce activity.</p>}</Section>}
  </main></AppLayout>;
}

function Section({title,children,className=""}:{title:string;children:React.ReactNode;className?:string}){return <section className={`glass-card p-5 ${className}`}><h2 className="text-xl font-bold">{title}</h2><div className="mt-4">{children}</div></section>}
function Info({label,value}:{label:string;value:string}){return <p className="mt-3"><span className="block text-xs uppercase tracking-wide text-slate-400">{label}</span><strong>{value}</strong></p>}

