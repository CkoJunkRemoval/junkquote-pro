"use client";
import { useEffect, useMemo, useState } from "react";
import {
  removeCompanyLogoAction,
  updateCompanyBrandingAction,
  uploadCompanyLogoAction,
} from "@/app/actions/company/branding";
import {
  supportedCurrencies,
  supportedTimezones,
  type CompanySettingsInput,
} from "@/lib/company/settingsTypes";
import { readableBrandForeground } from "@/lib/company/brandingColors";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import LogoUploadControl from "./LogoUploadControl";
import {
  createLogoPreview,
  validateLogoFile,
} from "@/lib/company/logoFileValidation";

type Company = Awaited<ReturnType<typeof updateCompanyBrandingAction>>;
type Section = "profile" | "branding" | "documents" | "regional";

export default function CompanySettings({
  initialCompany,
}: {
  initialCompany: Company;
}) {
  const [company, setCompany] = useState(initialCompany);
  const [draft, setDraft] = useState(() => values(initialCompany));
  const [saving, setSaving] = useState<Section | "logo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(values(company)),
    [company, draft],
  );
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(
    () => () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    },
    [logoPreviewUrl],
  );
  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  }
  async function save(section: Section) {
    setSaving(section);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCompanyBrandingAction(
        sectionData(section, draft),
      );
      setCompany(updated);
      setDraft(values(updated));
      setSuccess(`${sectionTitle(section)} saved.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save settings.",
      );
    } finally {
      setSaving(null);
    }
  }
  function selectLogo(file: File | null) {
    setError(null);
    setSuccess(null);
    if (!file) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);
      return;
    }
    try {
      validateLogoFile(file);
      setSelectedLogo(file);
      setLogoPreviewUrl(createLogoPreview(file, URL.createObjectURL));
    } catch (reason) {
      setSelectedLogo(null);
      setLogoPreviewUrl(null);
      setError(
        reason instanceof Error ? reason.message : "Unable to select logo.",
      );
    }
  }
  async function upload() {
    if (!selectedLogo) return;
    setSaving("logo");
    setError(null);
    setSuccess(null);
    try {
      const updated = await uploadCompanyLogoAction(selectedLogo);
      setCompany(updated as Company);
      setDraft(values(updated as Company));
      setSelectedLogo(null);
      setLogoPreviewUrl(null);
      setSuccess("Logo saved.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to upload logo.",
      );
    } finally {
      setSaving(null);
    }
  }
  async function removeLogo() {
    setSaving("logo");
    setError(null);
    setSuccess(null);
    try {
      await removeCompanyLogoAction();
      setCompany((current) => ({ ...current, logoUrl: null }));
      setSelectedLogo(null);
      setLogoPreviewUrl(null);
      setSuccess("Logo removed.");
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to remove logo.",
      );
      return false;
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div>
        <p className="text-sm font-semibold text-blue-700">JunkQuote Pro</p>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="mt-1 text-slate-600">
          Configure the business identity used across your documents.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-800"
        >
          {success}
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card
            title="Business Profile"
            description="Public business information."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Display name"
                value={draft.displayName}
                onChange={(value) => set("displayName", value)}
              />
              <Input
                label="Legal name"
                value={draft.legalName}
                onChange={(value) => set("legalName", value)}
              />
              <Input
                label="Phone"
                value={draft.phone}
                onChange={(value) => set("phone", value)}
              />
              <Input
                label="Email"
                type="email"
                value={draft.email}
                onChange={(value) => set("email", value)}
              />
              <Input
                label="Website"
                value={draft.website}
                onChange={(value) => set("website", value)}
              />
              <Input
                label="Address line 1"
                value={draft.addressLine1}
                onChange={(value) => set("addressLine1", value)}
              />
              <Input
                label="Address line 2"
                value={draft.addressLine2}
                onChange={(value) => set("addressLine2", value)}
              />
              <Input
                label="City"
                value={draft.city}
                onChange={(value) => set("city", value)}
              />
              <Input
                label="State"
                value={draft.state}
                onChange={(value) => set("state", value)}
              />
              <Input
                label="Postal code"
                value={draft.postalCode}
                onChange={(value) => set("postalCode", value)}
              />
            </div>
            <SaveButton
              busy={saving === "profile"}
              onClick={() => void save("profile")}
            />
          </Card>
          <Card
            title="Branding"
            description="A logo and accent colors for customer-facing documents."
          >
            <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
              <div>
                <p className="mb-2 text-sm font-medium">Company logo</p>
                <LogoUploadControl
                  companyName={draft.displayName}
                  currentLogoUrl={company.logoUrl}
                  selectedFile={selectedLogo}
                  previewUrl={logoPreviewUrl}
                  busy={saving === "logo"}
                  onFileChange={selectLogo}
                  onSave={() => void upload()}
                  onRemove={removeLogo}
                />
              </div>
              <div className="grid gap-3">
                <Input
                  label="Primary color"
                  value={draft.primaryColor}
                  onChange={(value) => set("primaryColor", value)}
                  placeholder="#2563eb"
                />
                <Input
                  label="Secondary color"
                  value={draft.secondaryColor}
                  onChange={(value) => set("secondaryColor", value)}
                  placeholder="#0f172a"
                />
              </div>
            </div>
            <SaveButton
              busy={saving === "branding"}
              onClick={() => void save("branding")}
            />
          </Card>
          <Card
            title="Document Defaults"
            description="Used for new documents and default financial settings."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Estimate prefix"
                value={draft.estimatePrefix}
                onChange={(value) => set("estimatePrefix", value)}
              />
              <Input
                label="Invoice prefix"
                value={draft.invoicePrefix}
                onChange={(value) => set("invoicePrefix", value)}
              />
              <Input
                label="Estimate expiration days"
                type="number"
                value={draft.defaultEstimateExpirationDays}
                onChange={(value) =>
                  set("defaultEstimateExpirationDays", value)
                }
              />
              <Input
                label="Payment terms days"
                type="number"
                value={draft.defaultPaymentTermsDays}
                onChange={(value) => set("defaultPaymentTermsDays", value)}
              />
              <Input
                label="Default tax rate (%)"
                type="number"
                value={draft.defaultTaxRate}
                onChange={(value) => set("defaultTaxRate", value)}
              />
              <Input
                label="Default minimum charge"
                type="number"
                value={draft.defaultMinimumCharge}
                onChange={(value) => set("defaultMinimumCharge", value)}
              />
            </div>
            <SaveButton
              busy={saving === "documents"}
              onClick={() => void save("documents")}
            />
          </Card>
          <Card
            title="Regional Settings"
            description="Formats and dates use these defaults."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Timezone
                <select
                  value={draft.timezone}
                  onChange={(event) => set("timezone", event.target.value)}
                  className="rounded border p-2"
                >
                  {supportedTimezones.map((timezone) => (
                    <option key={timezone}>{timezone}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Currency
                <select
                  value={draft.currencyCode}
                  onChange={(event) => set("currencyCode", event.target.value)}
                  className="rounded border p-2"
                >
                  {supportedCurrencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
            </div>
            <SaveButton
              busy={saving === "regional"}
              onClick={() => void save("regional")}
            />
          </Card>
        </div>
        <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">LIVE PREVIEW</p>
          <div
            className="mt-3 rounded-xl p-4"
            style={{
              backgroundColor: draft.primaryColor || "#2563eb",
              color: readableBrandForeground(draft.primaryColor || "#2563eb"),
              borderColor: draft.secondaryColor || "#0f172a",
              borderWidth: 4,
            }}
          >
            <div className="flex items-center gap-3">
              <CompanyLogo
                src={company.logoUrl}
                companyName={draft.displayName}
                size={40}
                fallbackClassName="rounded"
              />
              <div>
                <strong className="block">
                  {draft.displayName || "JunkQuote Pro"}
                </strong>
                <span className="text-sm">Estimate preview</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            JunkQuote Pro remains the product name in the application shell.
          </p>
        </aside>
      </div>
    </div>
  );
}

function values(company: Company) {
  return {
    legalName: company.legalName,
    displayName: company.displayName,
    email: company.email ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    addressLine1: company.addressLine1 ?? "",
    addressLine2: company.addressLine2 ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    postalCode: company.postalCode ?? "",
    primaryColor: company.primaryColor ?? "",
    secondaryColor: company.secondaryColor ?? "",
    invoicePrefix: company.invoicePrefix,
    estimatePrefix: company.estimatePrefix,
    defaultTaxRate: String(company.defaultTaxRate),
    defaultPaymentTermsDays: String(company.defaultPaymentTermsDays),
    defaultEstimateExpirationDays: String(
      company.defaultEstimateExpirationDays,
    ),
    defaultMinimumCharge: String(company.defaultMinimumCharge),
    timezone: company.timezone,
    currencyCode: company.currencyCode,
  };
}
function sectionTitle(section: Section) {
  return {
    profile: "Business profile",
    branding: "Branding",
    documents: "Document defaults",
    regional: "Regional settings",
  }[section];
}
function sectionData(
  section: Section,
  draft: ReturnType<typeof values>,
): CompanySettingsInput {
  const numeric = (value: string) => Number(value);
  if (section === "profile")
    return {
      legalName: draft.legalName,
      displayName: draft.displayName,
      email: draft.email,
      phone: draft.phone,
      website: draft.website,
      addressLine1: draft.addressLine1,
      addressLine2: draft.addressLine2,
      city: draft.city,
      state: draft.state,
      postalCode: draft.postalCode,
    };
  if (section === "branding")
    return {
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
    };
  if (section === "documents")
    return {
      estimatePrefix: draft.estimatePrefix,
      invoicePrefix: draft.invoicePrefix,
      defaultTaxRate: numeric(draft.defaultTaxRate),
      defaultPaymentTermsDays: numeric(draft.defaultPaymentTermsDays),
      defaultEstimateExpirationDays: numeric(
        draft.defaultEstimateExpirationDays,
      ),
      defaultMinimumCharge: numeric(draft.defaultMinimumCharge),
    };
  return { timezone: draft.timezone, currencyCode: draft.currencyCode };
}
function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border p-2 font-normal"
      />
    </label>
  );
}
function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="mt-5 rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
    >
      {busy ? "Saving..." : "Save section"}
    </button>
  );
}
