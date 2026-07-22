import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import FieldJobClient from "@/features/field/FieldJobClient";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  ensureFieldChecklist,
  getFieldJob,
  resolveFieldActor,
} from "@/lib/fieldOperations/fieldOperations";

export default async function FieldJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await requireTenantContext();
  const actor = await resolveFieldActor(tenant);
  await ensureFieldChecklist(tenant.companyId, id, actor);
  const job = await getFieldJob(tenant.companyId, id, actor);
  if (!job) notFound();
  return (
    <AppLayout>
      <FieldJobClient initialJob={job} companyId={tenant.companyId} userId={tenant.user.id} manager={actor.manager} />
    </AppLayout>
  );
}
