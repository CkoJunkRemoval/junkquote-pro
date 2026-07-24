import { prisma } from "@/lib/prisma";
import { assignCrewToJob, assignEmployeeToJob } from "@/lib/crews/assignments";
import { updateJob } from "@/lib/jobs/updateJob";
import type { DispatchProgress, JobPriority, SchedulingStatus } from "@/generated/prisma/client";
import { projectDispatchBoard, type DispatchLaneGrouping, type DispatchSeverity } from "./board";

export type DispatchView = "board" | "day" | "week" | "list";
export type DispatchFilters = {
  view?: DispatchView;
  status?: SchedulingStatus;
  employeeId?: string;
  crewLeadId?: string;
  vehicleId?: string;
  city?: string;
  zip?: string;
  serviceArea?: string;
  unscheduledOnly?: boolean;
  conflictOnly?: boolean;
  grouping?: DispatchLaneGrouping;
  alertSeverity?: DispatchSeverity;
  assignment?: "assigned" | "unassigned";
  highValue?: boolean;
  delayedOnly?: boolean;
  startsWithinHours?: number;
  unscheduledSearch?: string;
  unscheduledSort?: "oldest" | "newest" | "value" | "duration" | "priority";
  page?: number;
};

function visibleRange(date: Date, view: DispatchView) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (view === "week") start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + (view === "day" ? 1 : 7));
  return { start, end };
}

export async function getDispatchData(companyId: string, date: Date, crewUserId?: string, filters: DispatchFilters = {}) {
  const view: DispatchView = ["day", "week", "list"].includes(filters.view ?? "") ? filters.view! : "board";
  const { start, end } = visibleRange(date, view);
  const employee = crewUserId ? await prisma.employee.findFirst({ where: { companyId, userId: crewUserId, status: "Active" }, select: { id: true } }) : null;
  const assignedOnly = crewUserId ? { assignments: { some: { employeeId: employee?.id ?? "__unlinked__", status: { not: "Removed" as const } } } } : {};
  const resourceWhere = {
    ...(filters.employeeId ? { assignments: { some: { employeeId: filters.employeeId, status: { not: "Removed" as const } } } } : {}),
    ...(filters.crewLeadId ? { assignments: { some: { employeeId: filters.crewLeadId, lead: true, status: { not: "Removed" as const } } } } : {}),
    ...(filters.vehicleId ? { vehicleAssignments: { some: { fleetAssetId: filters.vehicleId } } } : {}),
    ...(filters.assignment === "assigned" ? { OR: [{ assignments: { some: { employeeId: { not: null }, status: { not: "Removed" as const } } } }, { vehicleAssignments: { some: {} } }] } : {}),
    ...(filters.assignment === "unassigned" ? { assignments: { none: { employeeId: { not: null }, status: { not: "Removed" as const } } }, vehicleAssignments: { none: {} } } : {}),
    ...((filters.city || filters.zip || filters.serviceArea) ? { property: {
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" as const } } : {}),
      ...(filters.zip ? { zip: filters.zip } : {}),
      ...(filters.serviceArea ? { OR: [{ city: { equals: filters.serviceArea, mode: "insensitive" as const } }, { zip: filters.serviceArea }] } : {}),
    } } : {}),
  };
  const include = {
    customer: { select: { firstName: true, lastName: true, phone: true } },
    property: { select: { address: true, city: true, state: true, zip: true } },
    estimate: { select: { pricingTotal: true, jobSites: { select: { items: { select: { crewRequirement: true, requiresSpecialEquipment: true, estimatedVolume: true } } } } } },
    invoice: { select: { total: true, balanceDue: true, status: true } },
    servicePlan: { select: { id: true, name: true } },
    photos: { select: { category: true } },
    assignments: { where: { status: { not: "Removed" as const } }, include: { employee: { select: { id: true, firstName: true, lastName: true } }, crew: { select: { id: true, name: true, color: true } } } },
    vehicleAssignments: { include: { fleetAsset: { select: { id: true, name: true, type: true, colorLabel: true, capacityCubicYards: true } } } },
  };
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const unscheduledOrder = filters.unscheduledSort === "newest" ? { createdAt: "desc" as const }
    : filters.unscheduledSort === "value" ? { estimate: { pricingTotal: "desc" as const } }
    : filters.unscheduledSort === "duration" ? { estimatedDurationMinutes: "asc" as const }
    : filters.unscheduledSort === "priority" ? { priority: "desc" as const }
    : { createdAt: "asc" as const };
  const unscheduledWhere = {
    companyId, ...assignedOnly, ...resourceWhere,
    AND: [
      { OR: [{ scheduledStart: null }, { schedulingStatus: "Unscheduled" as const }] },
      ...(filters.unscheduledSearch ? [{ OR: [
        { jobNumber: { contains: filters.unscheduledSearch, mode: "insensitive" as const } },
        { customer: { OR: [{ firstName: { contains: filters.unscheduledSearch, mode: "insensitive" as const } }, { lastName: { contains: filters.unscheduledSearch, mode: "insensitive" as const } }] } },
        { property: { OR: [{ city: { contains: filters.unscheduledSearch, mode: "insensitive" as const } }, { zip: { contains: filters.unscheduledSearch } }] } },
      ] }] : []),
    ],
  };
  const [jobs, unscheduled, unscheduledCount, crews, employees, vehicles, availability] = await Promise.all([
    prisma.job.findMany({
      where: {
        companyId, ...assignedOnly, ...resourceWhere, scheduledStart: { gte: start, lt: end },
        ...(filters.status ? { schedulingStatus: filters.status } : {}),
        ...(filters.delayedOnly ? { schedulingStatus: "Delayed" as const } : {}),
        ...(filters.startsWithinHours ? { scheduledStart: { gte: new Date(), lte: new Date(Date.now() + filters.startsWithinHours * 3600000) } } : {}),
      },
      include, orderBy: [{ scheduledStart: "asc" }, { jobNumber: "asc" }], skip: view === "list" ? (page - 1) * 100 : 0, take: view === "list" ? 100 : 500,
    }),
    prisma.job.findMany({ where: unscheduledWhere, include, orderBy: unscheduledOrder, skip: (page - 1) * 25, take: 25 }),
    prisma.job.count({ where: unscheduledWhere }),
    prisma.crew.findMany({ where: { companyId, active: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId, status: "Active" }, select: { id: true, firstName: true, lastName: true, role: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.fleetAsset.findMany({ where: { companyId, status: "Active" }, select: { id: true, name: true, type: true, colorLabel: true, capacityCubicYards: true }, orderBy: { name: "asc" } }),
    prisma.employeeAvailability.findMany({ where: { companyId, type: { in: ["Unavailable", "TimeOff"] }, startsAt: { lt: end }, endsAt: { gt: start } }, select: { employeeId: true } }),
  ]);
  const decorate = <T extends (typeof jobs)[number]>(job: T) => {
    const requiredCrewSize = Math.max(1, ...job.estimate.jobSites.flatMap((site) => site.items.map((item) => item.crewRequirement)));
    const conflicts = [
      ...(job.assignments.filter((row) => row.employeeId).length < requiredCrewSize ? ["Short crew"] : []),
      ...(!job.vehicleAssignments.length ? ["No vehicle"] : []),
      ...(!job.assignments.some((row) => row.employeeId) ? ["No crew"] : []),
      ...(job.arrivalWindowStart && job.arrivalWindowEnd && job.arrivalWindowEnd <= job.arrivalWindowStart ? ["Invalid arrival window"] : []),
    ];
    const paymentStatus = !job.invoice ? "No invoice" : job.invoice.balanceDue === 0 ? "Paid" : job.invoice.balanceDue < job.invoice.total ? "Partial" : "Unpaid";
    const notifications = [
      ...(job.status === "Completed" && !job.invoice ? ["Invoice not generated"] : []),
      ...(job.status === "Completed" && !job.photos.some((photo) => photo.category === "After") ? ["Missing after photos"] : []),
    ];
    return { ...job, requiredCrewSize, requiresSpecialEquipment: job.estimate.jobSites.some((site) => site.items.some((item) => item.requiresSpecialEquipment)), conflicts, paymentStatus, notifications };
  };
  let scheduledRows = jobs.map(decorate);
  let unscheduledRows = unscheduled.map(decorate);
  if (filters.highValue) {
    scheduledRows = scheduledRows.filter((job) => job.estimate.pricingTotal >= 1000);
    unscheduledRows = unscheduledRows.filter((job) => job.estimate.pricingTotal >= 1000);
  }
  const board = projectDispatchBoard({
    jobs: scheduledRows,
    unscheduled: unscheduledRows,
    employees,
    vehicles,
    unavailableEmployeeIds: new Set(availability.map((row) => row.employeeId)),
    grouping: filters.grouping ?? "crewLead",
  });
  const filteredAlerts = filters.alertSeverity ? board.alerts.filter((row) => row.severity === filters.alertSeverity) : board.alerts;
  return {
    jobs: filters.unscheduledOnly ? [] : filters.conflictOnly ? scheduledRows.filter((job) => job.conflicts.length) : scheduledRows,
    unscheduled: unscheduledRows, unscheduledCount, page,
    crews, employees, vehicles, start, end, view, readOnly: Boolean(crewUserId),
    grouping: filters.grouping ?? "crewLead", board: { ...board, alerts: filteredAlerts },
    metrics: {
      jobsToday: scheduledRows.length,
      completedJobs: scheduledRows.filter((job) => job.status === "Completed").length,
      activeCrews: new Set(scheduledRows.flatMap((job) => job.assignments.flatMap((row) => row.crewId ? [row.crewId] : []))).size,
    },
  };
}

export async function updateDispatchJob(companyId: string, jobId: string, input: { status?: "Unscheduled" | "Scheduled" | "InProgress" | "Completed" | "Cancelled"; dispatchProgress?: DispatchProgress; priority?: JobPriority; scheduledStart?: Date | null; scheduledEnd?: Date | null }) {
  if (input.status) return updateJob(companyId, { id: jobId, status: input.status, scheduledStart: input.scheduledStart, scheduledEnd: input.scheduledEnd });
  const job = await prisma.job.findFirst({ where: { id: jobId, companyId }, select: { id: true } });
  if (!job) throw new Error("Job not found.");
  return prisma.job.update({ where: { id: job.id }, data: { ...(input.dispatchProgress ? { dispatchProgress: input.dispatchProgress, ...(input.dispatchProgress === "EnRoute" ? { enRouteAt: new Date() } : input.dispatchProgress === "Arrived" ? { arrivedAt: new Date() } : {}) } : {}), ...(input.priority ? { priority: input.priority } : {}), ...(input.scheduledStart !== undefined ? { scheduledStart: input.scheduledStart } : {}), ...(input.scheduledEnd !== undefined ? { scheduledEnd: input.scheduledEnd } : {}) } });
}
export async function assignDispatchCrew(companyId: string, jobId: string, crewId: string) {
  const existing = await prisma.jobAssignment.findFirst({ where: { companyId, jobId, crewId } });
  return existing ?? assignCrewToJob(companyId, jobId, crewId);
}
export async function assignDispatchEmployee(companyId: string, jobId: string, employeeId: string) {
  const existing = await prisma.jobAssignment.findFirst({ where: { companyId, jobId, employeeId } });
  return existing ?? assignEmployeeToJob(companyId, jobId, employeeId);
}
