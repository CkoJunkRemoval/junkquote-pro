import type { DispatchFilters, DispatchView } from "./dispatch";
import type { SchedulingStatus } from "@/generated/prisma/client";

const views = new Set<DispatchView>(["board", "day", "week", "list"]);
const statuses = new Set<SchedulingStatus>(["Unscheduled","Tentative","Scheduled","Confirmed","EnRoute","Arrived","InProgress","Completed","Delayed","Cancelled","NoShow"]);
const truthy = (value?: string) => value === "1" || value === "true";
export function parseDispatchFilters(query: Record<string, string | undefined>): DispatchFilters {
  return {
    view: views.has(query.view as DispatchView) ? query.view as DispatchView : "board",
    status: statuses.has(query.status as SchedulingStatus) ? query.status as SchedulingStatus : undefined,
    employeeId: query.employeeId?.slice(0,100), crewLeadId: query.crewLeadId?.slice(0,100),
    vehicleId: query.vehicleId?.slice(0,100), city: query.city?.trim().slice(0,80),
    zip: query.zip?.trim().slice(0,20), serviceArea: query.serviceArea?.trim().slice(0,80),
    unscheduledOnly: truthy(query.unscheduledOnly), conflictOnly: truthy(query.conflictOnly),
    grouping: ["crewLead","crewMember","vehicle","unassigned"].includes(query.grouping ?? "") ? query.grouping as "crewLead"|"crewMember"|"vehicle"|"unassigned" : "crewLead",
    alertSeverity: ["critical","warning","info"].includes(query.alertSeverity ?? "") ? query.alertSeverity as "critical"|"warning"|"info" : undefined,
    assignment: ["assigned","unassigned"].includes(query.assignment ?? "") ? query.assignment as "assigned"|"unassigned" : undefined,
    highValue: truthy(query.highValue), delayedOnly: truthy(query.delayedOnly),
    startsWithinHours: query.startsWithinHours ? Math.min(24, Math.max(1, Math.trunc(Number(query.startsWithinHours) || 1))) : undefined,
    unscheduledSearch: query.unscheduledSearch?.trim().slice(0,100),
    unscheduledSort: ["oldest","newest","value","duration","priority"].includes(query.unscheduledSort ?? "") ? query.unscheduledSort as "oldest"|"newest"|"value"|"duration"|"priority" : "oldest",
    page: Math.max(1, Math.trunc(Number(query.page)||1)),
  };
}
