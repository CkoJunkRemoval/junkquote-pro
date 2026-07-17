"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  setEmployeeStatus,
  updateEmployee,
} from "@/app/actions/crews/management";
import type { EmployeeRole } from "@/generated/prisma/client";
import type { getEmployeeDetail } from "@/lib/crews/management";

type Employee = NonNullable<Awaited<ReturnType<typeof getEmployeeDetail>>>;
type EmployeeForm = ReturnType<typeof formFrom>;

const roles: EmployeeRole[] = [
  "Owner",
  "Manager",
  "CrewLead",
  "CrewMember",
  "Office",
];

function formFrom(employee: Employee) {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    role: employee.role,
    hourlyRate: employee.hourlyRate?.toString() ?? "",
    color: employee.color ?? "",
    notes: employee.notes ?? "",
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function EmployeeDetailEditor({
  initialEmployee,
}: {
  initialEmployee: Employee;
}) {
  const [employee, setEmployee] = useState(initialEmployee);
  const [form, setForm] = useState<EmployeeForm>(() => formFrom(initialEmployee));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(formFrom(employee)),
    [employee, form],
  );

  function updateField<K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  }

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    const hourlyRate = form.hourlyRate === "" ? null : Number(form.hourlyRate);
    if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) {
      setError("Hourly rate must be a non-negative number.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateEmployee(employee.id, { ...form, hourlyRate });
      const nextEmployee = { ...employee, ...updated };
      setEmployee(nextEmployee);
      setForm(formFrom(nextEmployee));
      setSuccess("Employee saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(nextStatus: "Active" | "Inactive") {
    if (nextStatus === employee.status) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await setEmployeeStatus(employee.id, nextStatus);
      setEmployee((current) => ({ ...current, ...updated }));
      setSuccess(`Employee ${nextStatus === "Active" ? "reactivated" : "deactivated"}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
        <Link href="/employees" className="hover:underline">Employees</Link>
        <span aria-hidden="true"> / </span>
        <span>{employee.firstName} {employee.lastName}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="mt-1 text-sm text-slate-600">{employee.role} · {employee.status}</p>
        </div>
        <Link href="/employees" className="rounded border px-3 py-2 text-sm font-medium">Back to employees</Link>
      </div>

      {error && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
      {success && <p role="status" className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-800">{success}</p>}

      <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-xl font-bold">Personal Information</h2><p className="text-sm text-slate-600">Contact details for this employee.</p></div>
          <span className="rounded-full border px-3 py-1 text-sm">{employee.status}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="First name" value={form.firstName} onChange={(value) => updateField("firstName", value)} required />
          <Field label="Last name" value={form.lastName} onChange={(value) => updateField("lastName", value)} required />
          <Field label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
          <Field label="Phone" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Employment</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">Role
            <select value={form.role} onChange={(event) => updateField("role", event.target.value as EmployeeRole)} className="rounded border p-2 font-normal">
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">Status
            <select value={employee.status} disabled={saving} onChange={(event) => void changeStatus(event.target.value as "Active" | "Inactive")} className="rounded border p-2 font-normal disabled:opacity-50">
              <option value="Active">Active</option><option value="Inactive">Inactive</option>
            </select>
          </label>
          <Field label="Hourly rate" type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(value) => updateField("hourlyRate", value)} />
          <Field label="Color" value={form.color} onChange={(value) => updateField("color", value)} placeholder="#2563eb" />
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Notes
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className="min-h-28 rounded border p-2 font-normal" />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={saving || !isDirty} onClick={() => void save()} className="rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
          <button disabled={saving || !isDirty} onClick={() => { setForm(formFrom(employee)); setError(null); setSuccess(null); }} className="rounded border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button disabled={saving} onClick={() => void changeStatus(employee.status === "Active" ? "Inactive" : "Active")} className="rounded border px-4 py-2 font-medium">{employee.status === "Active" ? "Deactivate" : "Reactivate"}</button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Crew Memberships</h2>
          <div className="mt-4 space-y-2">{employee.crewMembers.map((member) => <div key={member.crewId} className="rounded border p-3"><strong>{member.crew.name}</strong>{member.isLead && <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Lead</span>}</div>)}{employee.crewMembers.length === 0 && <Empty text="This employee is not assigned to a crew." />}</div>
        </article>
        <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Job Assignment History</h2>
          <div className="mt-4 space-y-2">{employee.assignments.map((assignment) => <div key={assignment.id} className="rounded border p-3"><Link href={`/jobs/${assignment.job.id}`} className="font-medium text-blue-700 hover:underline">Job {assignment.job.id}</Link><p className="mt-1 text-sm text-slate-600">Assigned {formatDate(assignment.assignedAt)}</p>{assignment.notes && <p className="mt-1 text-sm text-slate-600">{assignment.notes}</p>}</div>)}{employee.assignments.length === 0 && <Empty text="No job assignments yet." />}</div>
        </article>
      </section>

      <aside className="mt-6 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600"><h2 className="font-semibold text-slate-900">Audit information</h2><dl className="mt-2 grid gap-2 sm:grid-cols-3"><div><dt>Created</dt><dd>{formatDate(employee.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(employee.updatedAt)}</dd></div><div><dt>Total jobs assigned</dt><dd>{employee.assignments.length}</dd></div></dl></aside>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required, ...inputProps }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; step?: string; placeholder?: string }) {
  return <label className="grid gap-1 text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}<input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="rounded border p-2 font-normal" {...inputProps} /></label>;
}

function Empty({ text }: { text: string }) { return <p className="rounded border border-dashed p-3 text-sm text-slate-500">{text}</p>; }
