import { createExpenseAction } from "@/app/actions/finance/finance";
import FinanceShell, { financeField } from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import { getFinanceFormOptions } from "@/lib/finance/service";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => <label><span className="mb-1 block text-sm text-slate-300">{label}</span>{children}</label>;

export default async function NewExpensePage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.expenses.manage");
  const options = await getFinanceFormOptions(tenant.companyId);
  return (
    <FinanceShell
      active="/finance/expenses"
      title="Add expense"
      description="Record a draft business cost. Component amounts must equal the total."
    >
      <form action={createExpenseAction} className="glass-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Transaction date">
          <input required name="transactionDate" type="date" className={financeField} />
        </Field>
        <Field label="Posting date (optional)">
          <input name="postingDate" type="date" className={financeField} />
        </Field>
        <Field label="Category">
          <select required name="categoryId" className={financeField}>
            <option value="">Choose category</option>
            {options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Vendor">
          <select name="vendorId" className={financeField}>
            <option value="">No vendor</option>
            {options.vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Payment method">
          <select name="paymentMethod" className={financeField}>
            <option value="">Not specified</option>
            {["Cash", "Check", "CreditCard", "DebitCard", "ACH", "Other"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select name="sourceType" className={financeField}>
            {["Manual", "Fuel", "Maintenance", "AssetPurchase", "DumpFee", "Subscription", "Import", "System"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <label className="sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm text-slate-300">Description</span>
          <input required name="description" className={financeField} />
        </label>
        {["subtotal", "tax", "tip", "fee", "total"].map((name) => (
          <Field key={name} label={name[0].toUpperCase() + name.slice(1)}>
            <input required={name === "subtotal" || name === "total"} name={name} type="number" min="0" step=".01" defaultValue={name === "subtotal" || name === "total" ? undefined : "0.00"} className={financeField} />
          </Field>
        ))}
        <Field label="Currency">
          <input name="currencyCode" defaultValue="USD" maxLength={3} className={financeField} />
        </Field>
        <Field label="Business use % (placeholder)">
          <input name="businessUsePercentage" type="number" min="0" max="100" className={financeField} />
        </Field>
        <Field label="Transaction reference">
          <input name="transactionReference" className={financeField} />
        </Field>
        <Field label="Receipt (private)">
          <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={`${financeField} file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1 file:font-semibold file:text-slate-950`} />
        </Field>
        <label className="sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm text-slate-300">Notes</span>
          <textarea name="notes" rows={3} className={financeField} />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <button name="intent" value="draft" className="ui-button ui-button--secondary min-h-11 rounded-xl px-5 font-semibold">Save draft</button>
          <button name="intent" value="submit" className="ui-button ui-button--primary min-h-11 rounded-xl px-5 font-semibold">Submit for approval</button>
        </div>
      </form>
    </FinanceShell>
  );
}
