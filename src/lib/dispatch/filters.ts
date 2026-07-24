import type { DispatchFilters, DispatchView } from "./dispatch";
import type { SchedulingStatus } from "@/generated/prisma/client";

const views = new Set<DispatchView>(["day", "week", "list"]);
const statuses = new Set<SchedulingStatus>(["Unscheduled","Tentative","Scheduled","Confirmed","EnRoute","Arrived","InProgress","Completed","Delayed","Cancelled","NoShow"]);
const truthy = (value?: string) => value === "1" || value === "true";
export function parseDispatchFilters(query: Record<string, string | undefined>): DispatchFilters {
  return {
    view: views.has(query.view as DispatchView) ? query.view as DispatchView : "day",
    status: statuses.has(query.status as SchedulingStatus) ? query.status as SchedulingStatus : undefined,
    employeeId: query.employeeId?.slice(0,100), crewLeadId: query.crewLeadId?.slice(0,100),
    vehicleId: query.vehicleId?.slice(0,100), city: query.city?.trim().slice(0,80),
    zip: query.zip?.trim().slice(0,20), serviceArea: query.serviceArea?.trim().slice(0,80),
    unscheduledOnly: truthy(query.unscheduledOnly), conflictOnly: truthy(query.conflictOnly),
    page: Math.max(1, Math.trunc(Number(query.page)||1)),
  };
}
