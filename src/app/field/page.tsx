import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import FieldDashboardList from "@/features/field/FieldDashboardList";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getFieldDashboard, resolveFieldActor, runFieldQuery } from "@/lib/fieldOperations/fieldOperations";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  console.info("FIELD_STAGE_1 route entered");
  const tenant = await runFieldQuery("tenant_context", requireTenantContext);
  console.info("FIELD_STAGE_2 session resolved");
  console.info("FIELD_STAGE_3 company resolved");
  console.info("FIELD_STAGE_4 permissions checked");
  console.info("FIELD_STAGE_5 data query started");
  const actor = await resolveFieldActor(tenant, { allowUnlinked: true });
  const data = await getFieldDashboard(tenant.companyId, actor);
  console.info("FIELD_STAGE_6 jobs loaded");
  console.info("FIELD_STAGE_7 crew loaded");
  console.info("FIELD_STAGE_8 render started");
  const page = <AppLayout><main className="space-y-5 p-4 pb-24 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Crew App</p><h1 className="text-3xl font-bold">Field dashboard</h1></div>{actor.manager&&<Link className="min-h-12 rounded bg-slate-900 px-4 py-3 text-white" href="/field/change-orders">Review change orders</Link>}</div>
    {data.currentJob&&<div className="rounded-xl bg-blue-700 p-5 text-white"><p className="text-sm">Current job</p><Link className="text-xl font-semibold underline" href={`/field/jobs/${data.currentJob.id}`}>{data.currentJob.jobNumber??"Open job"} · {data.currentJob.fieldStage}</Link></div>}
    <div className="grid gap-5 lg:grid-cols-2"><FieldDashboardList title="Today's Jobs" jobs={data.today}/><FieldDashboardList title="Upcoming Jobs" jobs={data.upcoming}/><FieldDashboardList title="Overdue Jobs" jobs={data.overdue}/><FieldDashboardList title="Completed Today" jobs={data.completedToday}/></div>
  </main></AppLayout>;
  console.info("FIELD_STAGE_9 render completed");
  return page;
}
