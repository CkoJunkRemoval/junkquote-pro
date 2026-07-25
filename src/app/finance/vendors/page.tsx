import { createVendorAction } from "@/app/actions/finance/finance";
import FinanceShell, { financeField } from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  hasFinanceCapability,
  requireFinanceCapability,
} from "@/lib/finance/permissions";
import { listVendors } from "@/lib/finance/service";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.vendors.view");
  const query = await searchParams;
  const vendors = await listVendors(tenant.companyId, query.search);
  const canManage = hasFinanceCapability(tenant.role, "finance.vendors.manage");
  return (
    <FinanceShell active="/finance/vendors" title="Vendors" description="A company-scoped directory for business payees and operational suppliers. Sensitive banking or full tax identifiers do not belong here.">
      <form className="glass-card flex flex-wrap gap-3 p-4">
        <input name="search" defaultValue={query.search} placeholder="Search vendors" className={`${financeField} max-w-lg`} />
        <button className="ui-button ui-button--secondary rounded-xl px-4 font-semibold">Search</button>
      </form>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <article className="glass-card p-5" key={vendor.id}>
            <div className="flex justify-between gap-3">
              <h2 className="text-lg font-bold">{vendor.name}</h2>
              <span className="status-chip rounded-full px-2 py-1 text-xs">{vendor.active ? "Active" : "Inactive"}</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{vendor.type}</p>
            <p className="mt-4 text-sm">{vendor.contactName ?? "No contact"}<span className="block text-slate-400">{vendor.email ?? vendor.phone ?? "No contact details"}</span></p>
            <p className="mt-4 text-xs text-slate-400">{vendor._count.expenses} expenses · {vendor._count.documents} documents</p>
          </article>
        ))}
      </div>
      {canManage && (
        <form action={createVendorAction} className="glass-card mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="text-xl font-bold sm:col-span-2 lg:col-span-4">Add vendor</h2>
          <input required name="name" placeholder="Vendor name" className={financeField} />
          <select name="type" className={financeField}>
            {["LANDFILL", "TRANSFER_STATION", "FUEL_STATION", "MECHANIC", "AUTO_PARTS", "EQUIPMENT_DEALER", "HARDWARE_STORE", "SOFTWARE_PROVIDER", "INSURANCE_PROVIDER", "ACCOUNTANT", "ATTORNEY", "SUBCONTRACTOR", "LANDLORD", "UTILITY", "OTHER"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <input name="contactName" placeholder="Contact name" className={financeField} />
          <input name="email" type="email" placeholder="Email" className={financeField} />
          <input name="phone" placeholder="Phone" className={financeField} />
          <input name="website" type="url" placeholder="Website" className={financeField} />
          <input name="paymentTerms" placeholder="Payment terms" className={financeField} />
          <button className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold">Add vendor</button>
        </form>
      )}
    </FinanceShell>
  );
}
