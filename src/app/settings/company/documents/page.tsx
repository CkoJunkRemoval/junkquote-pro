import { requireAdminTenant } from "@/lib/auth/tenant";
import { getCompanyHub } from "@/lib/companyHub/service";
import CompanyHubShell, { HubCard } from "@/features/companyHub/CompanyHubShell";

export default async function DocumentsPage() {
  const { companyId } = await requireAdminTenant();
  await getCompanyHub(companyId);
  return (
    <CompanyHubShell title="Company Documents" description="Private company vault for compliance and operating documents.">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <HubCard title="Upload document">
          <form className="grid gap-4" aria-describedby="document-upload-status">
            <label className="grid gap-1 text-sm font-semibold">Category
              <select name="category" disabled className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 disabled:cursor-not-allowed disabled:opacity-60">
                {["Insurance","Licenses","Certifications","Contracts","Policies","SOPs","Safety manuals","Miscellaneous"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Private file
              <input name="file" type="file" disabled className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 p-2 disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
            <button disabled className="min-h-11 rounded-xl bg-slate-700 px-5 font-black text-slate-300 disabled:cursor-not-allowed">Upload unavailable</button>
            <p id="document-upload-status" role="status" className="text-sm text-amber-300">
              Uploads are disabled until authenticated tenant-authorized document delivery is available.
            </p>
          </form>
        </HubCard>
        <HubCard title="Vault">
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            Document listing is unavailable until authenticated tenant-authorized delivery is implemented.
          </p>
        </HubCard>
      </div>
    </CompanyHubShell>
  );
}
