import AppLayout from "@/components/layout/AppLayout";
import DispatchCenter from "@/features/dispatch/DispatchCenter";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { getDispatchData } from "@/lib/dispatch/dispatch";
import { parseDispatchFilters } from "@/lib/dispatch/filters";
export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireCompanyRole("Owner", "Admin", "Office", "Crew");
  const query = await searchParams;
  const rawDate = query.date;
  const date =
    rawDate && !Number.isNaN(new Date(`${rawDate}T12:00:00`).getTime())
      ? new Date(`${rawDate}T12:00:00`)
      : new Date();
  const filters = parseDispatchFilters(query);
  const data = await getDispatchData(
    context.companyId,
    date,
    context.role === "Crew" ? context.user.id : undefined,
    filters,
  );
  return (
    <AppLayout>
      <DispatchCenter
        initial={data}
        date={date.toISOString().slice(0, 10)}
        canConfigure={["Owner", "Admin"].includes(context.role)}
      />
    </AppLayout>
  );
}
