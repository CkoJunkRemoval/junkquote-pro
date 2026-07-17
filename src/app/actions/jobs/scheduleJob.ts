"use server";

import { scheduleJob, type ScheduleJobInput } from "@/lib/jobs/scheduleJob";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function scheduleJobAction(input: ScheduleJobInput) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return scheduleJob(companyId, input);
}
