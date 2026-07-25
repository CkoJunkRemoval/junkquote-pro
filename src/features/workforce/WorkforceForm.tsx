import type { Crew, Employee } from "@/generated/prisma/client";

const input = "min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-background)] px-3 py-2 text-[var(--input-foreground)]";

export function WorkforceForm({
  action,
  member,
  managers,
  crews,
  submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  member?: Employee | null;
  managers: Pick<Employee, "id" | "firstName" | "lastName">[];
  crews: Pick<Crew, "id" | "name">[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="glass-card grid gap-5 p-6 md:grid-cols-2">
      <Field name="employeeNumber" label="Employee number" defaultValue={member?.employeeNumber} />
      <Field name="preferredName" label="Preferred name" defaultValue={member?.preferredName} />
      <Field name="firstName" label="Legal first name" required defaultValue={member?.firstName} />
      <Field name="middleName" label="Legal middle name" defaultValue={member?.middleName} />
      <Field name="lastName" label="Legal last name" required defaultValue={member?.lastName} />
      <Field name="email" label="Email" type="email" defaultValue={member?.email} />
      <Field name="phone" label="Phone" type="tel" defaultValue={member?.phone} />
      <Field name="jobTitle" label="Job title" defaultValue={member?.jobTitle} />
      <Field name="department" label="Department" defaultValue={member?.department} />
      <Field name="hireDate" label="Hire date" type="date" defaultValue={dateValue(member?.hireDate)} />
      <Select name="workerType" label="Worker type" defaultValue={member?.workerType ?? "Employee"} values={["Employee", "Contractor", "Owner"]} />
      <Select name="role" label="Operational role" defaultValue={member?.role ?? "CrewMember"} values={["Owner", "Manager", "Estimator", "CrewLead", "CrewMember", "Office"]} />
      <Select name="managerId" label="Manager" defaultValue={member?.managerId ?? ""} values={managers.map((item) => [item.id, `${item.firstName} ${item.lastName}`])} optional />
      <Select name="defaultCrewId" label="Default crew" defaultValue={member?.defaultCrewId ?? ""} values={crews.map((item) => [item.id, item.name])} optional />
      <Field name="addressLine1" label="Address" defaultValue={member?.addressLine1} />
      <Field name="addressLine2" label="Address line 2" defaultValue={member?.addressLine2} />
      <Field name="city" label="City" defaultValue={member?.city} />
      <Field name="state" label="State" defaultValue={member?.state} />
      <Field name="postalCode" label="Postal code" defaultValue={member?.postalCode} />
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="authorizedDriver" defaultChecked={member?.authorizedDriver} className="h-5 w-5 accent-[var(--brand-orange)]" /> Authorized driver</label>
      <Field name="driverLicenseState" label="License state" defaultValue={member?.driverLicenseState} />
      <Field name="driverLicenseClass" label="License class" defaultValue={member?.driverLicenseClass} />
      <Field name="driverLicenseExpiresAt" label="License expiration" type="date" defaultValue={dateValue(member?.driverLicenseExpiresAt)} />
      <label className="grid gap-2 md:col-span-2">Driving restrictions<textarea name="drivingRestrictions" defaultValue={member?.drivingRestrictions ?? ""} className={`${input} min-h-24`} /></label>
      <label className="grid gap-2 md:col-span-2">Internal notes<textarea name="notes" defaultValue={member?.notes ?? ""} className={`${input} min-h-24`} /></label>
      <button className="ui-button ui-button--primary rounded-xl px-6 py-3 font-semibold md:col-span-2">{submitLabel}</button>
    </form>
  );
}

function Field({ label, defaultValue, ...props }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string | null }) {
  return <label className="grid gap-2">{label}<input {...props} defaultValue={defaultValue ?? ""} className={input} /></label>;
}
function Select({ label, name, values, defaultValue, optional }: { label: string; name: string; values: (string | [string, string])[]; defaultValue: string; optional?: boolean }) {
  return <label className="grid gap-2">{label}<select name={name} defaultValue={defaultValue} className={input}>{optional && <option value="">Not assigned</option>}{values.map((value) => { const [key, text] = Array.isArray(value) ? value : [value, value.replace(/([a-z])([A-Z])/g, "$1 $2")]; return <option key={key} value={key}>{text}</option>; })}</select></label>;
}
function dateValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

