import FinanceShell from "@/features/finance/FinanceShell";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import { listFinanceDocuments } from "@/lib/finance/service";

export default async function FinanceReceiptsPage() {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.receipts.view");
  const documents = await listFinanceDocuments(tenant.companyId);
  return (
    <FinanceShell active="/finance/receipts" title="Receipts & documents" description="Private finance files are tenant-authorized and never exposed through public object URLs.">
      <div className="grid gap-3">
        {documents.map((document) => (
          <a href={`/api/finance/documents/${document.id}`} className="glass-card grid min-h-16 gap-2 p-4 hover:border-blue-400/50 sm:grid-cols-[1fr_auto]" key={document.id}>
            <span>
              <strong>{document.originalFilename}</strong>
              <small className="block text-slate-400">
                {document.category} · {document.vendor?.name ?? "No vendor"} · {document.expense ? `Expense #${document.expense.expenseNumber}` : "Unlinked"}
              </small>
            </span>
            <span className="text-sm text-blue-300">Authorized download</span>
          </a>
        ))}
        {!documents.length && <div className="glass-card p-10 text-center text-slate-400">No finance documents have been uploaded.</div>}
      </div>
    </FinanceShell>
  );
}
