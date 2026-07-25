import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createWorkforceMemberAction } from "@/app/actions/workforce/workforce";
import { WorkforceForm } from "@/features/workforce/WorkforceForm";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireWorkforceCapability } from "@/lib/workforce/permissions";
import { getWorkforceFormOptions } from "@/lib/workforce/service";

export default async function NewTeamMemberPage() {
  const c = await requireTenantContext();
  requireWorkforceCapability(c.role, "workforce.manage");
  const { managers, crews } = await getWorkforceFormOptions(c.companyId);
  async function create(form: FormData) { "use server"; const id = await createWorkforceMemberAction(form); redirect(`/team/${id}`); }
  return <AppLayout><main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-10"><h1 className="text-3xl font-bold">Add team member</h1><p className="mb-6 mt-2 text-slate-400">Create an employment record. Login access remains optional.</p><WorkforceForm action={create} managers={managers} crews={crews} submitLabel="Create team member" /></main></AppLayout>;
}
