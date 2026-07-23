"use client";

import { Copy, MoreHorizontal, Pencil, Plus, RotateCcw, Star, Trash2, Archive } from "lucide-react";
import { useState } from "react";
import {
  createPricingProfileAction, deletePricingProfileAction, duplicatePricingProfileAction,
  setDefaultPricingProfileAction, setPricingProfileArchivedAction, updatePricingProfileAction,
} from "@/app/actions/pricingProfiles/pricingProfiles";
import type { PricingProfile } from "@/generated/prisma/client";
import type { PricingProfileInput } from "@/lib/pricingProfiles/types";

type ProfileRow = PricingProfile & { _count: { estimates: number } };
const emptyProfile: PricingProfileInput = {
  name: "", description: "", minimumCharge: 0, tripFee: 0, laborRate: 0, dumpFee: 0,
  mileageRate: 0, fuelSurcharge: 0, defaultCrewSize: 2, taxEnabled: false, taxRate: 0,
  currency: "USD", displayOrder: 0,
};
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function PricingProfilesManagement({ initialProfiles, canManage }: { initialProfiles: ProfileRow[]; canManage: boolean }) {
  const [profiles, setProfiles] = useState(initialProfiles), [editing, setEditing] = useState<ProfileRow | "new" | null>(null);
  const [error, setError] = useState(""), [busyId, setBusyId] = useState<string | null>(null);
  const replace = (profile: PricingProfile) => setProfiles((current) => current.map((row) => row.id === profile.id ? { ...row, ...profile } : row));
  async function duplicate(profile: ProfileRow) {
    setBusyId(profile.id); setError("");
    try { const created = await duplicatePricingProfileAction(profile.id); setProfiles((current) => [...current, { ...created, _count: { estimates: 0 } }]); }
    catch (reason) { setError(message(reason)); } finally { setBusyId(null); }
  }
  async function setDefault(profile: ProfileRow) {
    const previous = profiles;
    setProfiles((current) => current.map((row) => ({ ...row, defaultProfile: row.id === profile.id })));
    setBusyId(profile.id); setError("");
    try { replace(await setDefaultPricingProfileAction(profile.id)); }
    catch (reason) { setProfiles(previous); setError(message(reason)); } finally { setBusyId(null); }
  }
  async function archive(profile: ProfileRow, archived: boolean) {
    const previous = profiles;
    setProfiles((current) => current.map((row) => row.id === profile.id ? { ...row, active: !archived } : row));
    setBusyId(profile.id); setError("");
    try { replace(await setPricingProfileArchivedAction(profile.id, archived)); }
    catch (reason) { setProfiles(previous); setError(message(reason)); } finally { setBusyId(null); }
  }
  async function remove(profile: ProfileRow) {
    if (!window.confirm(`Delete “${profile.name}”? This cannot be undone.`)) return;
    const previous = profiles; setProfiles((current) => current.filter((row) => row.id !== profile.id));
    setBusyId(profile.id); setError("");
    try { await deletePricingProfileAction(profile.id); }
    catch (reason) { setProfiles(previous); setError(message(reason)); } finally { setBusyId(null); }
  }
  return <main className="mx-auto max-w-7xl p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Pricing Profiles</h1><p className="mt-1 text-slate-600 dark:text-slate-300">Reusable company pricing defaults for estimates.</p></div>{canManage && <button type="button" onClick={() => setEditing("new")} className={primary}><Plus size={18} /> New Profile</button>}</header>
    {!canManage && <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Pricing profiles are read only for your role.</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {editing && <div className="mt-6"><PricingProfileForm profile={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onSaved={(saved) => { if (editing === "new") setProfiles((current) => [...current, { ...saved, _count: { estimates: 0 } }]); else replace(saved); setEditing(null); }} /></div>}
    <div className="mt-6 hidden overflow-visible rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] md:block"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 dark:bg-slate-900"><tr>{["Profile", "Minimum", "Labor rate", "Trip fee", "Dump fee", "Crew", "Tax", "Status", ""].map((heading) => <th key={heading} className="p-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id} className="border-b last:border-0"><td className="p-3"><div className="flex items-center gap-2 font-semibold">{profile.name}{profile.defaultProfile && <Badge>Default</Badge>}</div><p className="max-w-xs truncate text-xs text-slate-500">{profile.description || "No description"}</p></td><td className="p-3">{formatMoney(profile.minimumCharge, profile.currency)}</td><td className="p-3">{formatMoney(profile.laborRate, profile.currency)}</td><td className="p-3">{formatMoney(profile.tripFee, profile.currency)}</td><td className="p-3">{formatMoney(profile.dumpFee, profile.currency)}</td><td className="p-3">{profile.defaultCrewSize}</td><td className="p-3">{profile.taxEnabled ? `${profile.taxRate}%` : "Off"}</td><td className="p-3">{profile.active ? "Active" : "Archived"}</td><td className="p-3">{canManage && <Actions profile={profile} busy={busyId === profile.id} onEdit={() => setEditing(profile)} onDuplicate={() => void duplicate(profile)} onDefault={() => void setDefault(profile)} onArchive={() => void archive(profile, profile.active)} onDelete={() => void remove(profile)} />}</td></tr>)}</tbody></table></div>
    <div className="mt-6 grid gap-4 md:hidden">{profiles.map((profile) => <article key={profile.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{profile.name}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{profile.description || "No description"}</p></div>{profile.defaultProfile && <Badge>Default</Badge>}</div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Metric label="Minimum charge" value={formatMoney(profile.minimumCharge, profile.currency)} /><Metric label="Labor rate" value={formatMoney(profile.laborRate, profile.currency)} /><Metric label="Trip fee" value={formatMoney(profile.tripFee, profile.currency)} /><Metric label="Dump fee" value={formatMoney(profile.dumpFee, profile.currency)} /><Metric label="Crew size" value={String(profile.defaultCrewSize)} /><Metric label="Tax" value={profile.taxEnabled ? `${profile.taxRate}%` : "Off"} /><Metric label="Status" value={profile.active ? "Active" : "Archived"} /><Metric label="Estimates" value={String(profile._count.estimates)} /></dl>{canManage && <div className="mt-4"><Actions profile={profile} busy={busyId === profile.id} onEdit={() => setEditing(profile)} onDuplicate={() => void duplicate(profile)} onDefault={() => void setDefault(profile)} onArchive={() => void archive(profile, profile.active)} onDelete={() => void remove(profile)} /></div>}</article>)}</div>
    {profiles.length === 0 && <div className="mt-6 rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">No pricing profiles yet</h2><p className="mt-2 text-sm text-slate-600">Create a profile to define reusable estimate defaults.</p></div>}
  </main>;
}

function PricingProfileForm({ profile, onCancel, onSaved }: { profile?: ProfileRow; onCancel: () => void; onSaved: (profile: PricingProfile) => void }) {
  const [value, setValue] = useState<PricingProfileInput>(profile ? {
    name: profile.name, description: profile.description, minimumCharge: profile.minimumCharge, tripFee: profile.tripFee,
    laborRate: profile.laborRate, dumpFee: profile.dumpFee, mileageRate: profile.mileageRate,
    fuelSurcharge: profile.fuelSurcharge, defaultCrewSize: profile.defaultCrewSize, taxEnabled: profile.taxEnabled,
    taxRate: profile.taxRate, currency: profile.currency, displayOrder: profile.displayOrder,
  } : emptyProfile), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const change = <K extends keyof PricingProfileInput>(key: K, next: PricingProfileInput[K]) => setValue((current) => ({ ...current, [key]: next }));
  async function save() { setSaving(true); setError(""); try { onSaved(profile ? await updatePricingProfileAction(profile.id, value) : await createPricingProfileAction(value)); } catch (reason) { setError(message(reason)); } finally { setSaving(false); } }
  return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 sm:p-6"><h2 className="text-lg font-semibold">{profile ? "Edit Pricing Profile" : "Create Pricing Profile"}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Text label="Name" value={value.name} onChange={(next) => change("name", next)} required /><Text label="Description" value={value.description ?? ""} onChange={(next) => change("description", next)} /><NumberField label="Minimum charge" value={value.minimumCharge} onChange={(next) => change("minimumCharge", next)} /><NumberField label="Trip fee" value={value.tripFee} onChange={(next) => change("tripFee", next)} /><NumberField label="Labor rate" value={value.laborRate} onChange={(next) => change("laborRate", next)} /><NumberField label="Dump fee" value={value.dumpFee} onChange={(next) => change("dumpFee", next)} /><NumberField label="Mileage rate" value={value.mileageRate} onChange={(next) => change("mileageRate", next)} /><NumberField label="Fuel surcharge" value={value.fuelSurcharge} onChange={(next) => change("fuelSurcharge", next)} /><NumberField label="Default crew size" value={value.defaultCrewSize} min={1} step={1} onChange={(next) => change("defaultCrewSize", next)} /><Text label="Currency" value={value.currency} onChange={(next) => change("currency", next.toUpperCase())} /><NumberField label="Display order" value={value.displayOrder} step={1} onChange={(next) => change("displayOrder", next)} /><label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={value.taxEnabled} onChange={(event) => change("taxEnabled", event.target.checked)} /> Tax enabled</label>{value.taxEnabled && <NumberField label="Tax rate (%)" value={value.taxRate} max={100} onChange={(next) => change("taxRate", next)} />}</div>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-5 flex gap-3"><button type="button" disabled={saving} onClick={() => void save()} className={primary}>{saving ? "Saving…" : "Save Profile"}</button><button type="button" disabled={saving} onClick={onCancel} className={secondary}>Cancel</button></div></section>;
}
function Actions({ profile, busy, onEdit, onDuplicate, onDefault, onArchive, onDelete }: { profile: ProfileRow; busy: boolean; onEdit: () => void; onDuplicate: () => void; onDefault: () => void; onArchive: () => void; onDelete: () => void }) {
  return <details className="relative"><summary aria-label={`Actions for ${profile.name}`} className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border focus-visible:ring-2"><MoreHorizontal /></summary><div className="absolute right-0 z-20 mt-1 grid min-w-48 rounded-xl border bg-white p-1 text-slate-950 shadow-xl">{profile.active && <Action icon={Pencil} label="Edit" onClick={onEdit} disabled={busy} />}<Action icon={Copy} label="Duplicate" onClick={onDuplicate} disabled={busy} />{profile.active && !profile.defaultProfile && <Action icon={Star} label="Make default" onClick={onDefault} disabled={busy} />}<Action icon={profile.active ? Archive : RotateCcw} label={profile.active ? "Archive" : "Restore"} onClick={onArchive} disabled={busy} />{!profile.active && <Action icon={Trash2} label="Delete" onClick={onDelete} disabled={busy} destructive />}</div></details>;
}
function Action({ icon: Icon, label, onClick, disabled, destructive }: { icon: typeof Pencil; label: string; onClick: () => void; disabled: boolean; destructive?: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-100 disabled:opacity-50 ${destructive ? "text-red-700" : ""}`}><Icon size={16} />{label}</button>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">{children}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>; }
const control = "min-h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-semibold text-white disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border px-5 font-semibold disabled:opacity-60";
function Text({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="grid gap-1 text-sm font-medium">{label}<input className={control} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange, min = 0, max, step = 0.01 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) { return <label className="grid gap-1 text-sm font-medium">{label}<input className={control} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function formatMoney(value: number, currency: string) { try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value); } catch { return money.format(value); } }
function message(reason: unknown) { return reason instanceof Error ? reason.message : "Unable to update pricing profile."; }
