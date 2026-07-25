import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireWorkforceCapability } from "@/lib/workforce/permissions";
import { getExpiringCredentials } from "@/lib/workforce/service";

export default async function WorkforceCredentialsPage() {
  const c = await requireTenantContext();
  requireWorkforceCapability(c.role, "workforce.view");
  const credentials = await getExpiringCredentials(c.companyId, 30);
  return <AppLayout><main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10"><Link href="/team" className="inline-flex min-h-11 items-center text-blue-300">← Team directory</Link><h1 className="mt-3 text-3xl font-bold">Credentials expiring soon</h1><p className="mt-2 text-slate-400">Documents and certifications expiring in the next 30 days.</p><div className="glass-card mt-6 overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-white/10"><th className="p-4">Team member</th><th className="p-4">Credential</th><th className="p-4">Type</th><th className="p-4">Expiration</th></tr></thead><tbody>{credentials.map(item=><tr key={item.id} className="border-b border-white/10"><td className="p-4"><Link href={`/team/${item.employee.id}?section=credentials`} className="font-semibold text-blue-300">{item.employee.firstName} {item.employee.lastName}</Link></td><td className="p-4">{item.title}</td><td className="p-4">{item.type}</td><td className="p-4">{item.expirationDate?.toLocaleDateString()}</td></tr>)}</tbody></table>{!credentials.length&&<p className="p-8 text-center text-slate-400">No credentials expire in the next 30 days.</p>}</div></main></AppLayout>;
}

