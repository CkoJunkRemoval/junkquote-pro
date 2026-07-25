import { requireAdminTenant } from "@/lib/auth/tenant";
import { getPermissionOverview } from "@/lib/companyHub/service";
import CompanyHubShell, { HubCard } from "@/features/companyHub/CompanyHubShell";

export default async function PermissionsPage() {
  await requireAdminTenant();
  const matrix = getPermissionOverview();
  const modules = ["companyAdministration","workforce","fleet","finance","tax"] as const;
  return (
    <CompanyHubShell title="Permission Overview" description="Read-only role and module access. Permission editing remains separate.">
      <HubCard title="Role matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="border-b border-slate-700"><th className="p-3">Role</th>{modules.map((module) => <th key={module} className="p-3">{module}</th>)}</tr></thead>
            <tbody>{matrix.map((row) => <tr key={row.role} className="border-b border-slate-800"><th className="p-3">{row.role}</th>{modules.map((module) => <td key={module} className="p-3">{row[module] ? "Allowed" : "—"}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </HubCard>
    </CompanyHubShell>
  );
}
