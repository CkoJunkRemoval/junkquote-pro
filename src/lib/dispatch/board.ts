import type { SchedulingStatus } from "@/generated/prisma/client";
import type { RouteAddress } from "@/lib/routeIntelligence/location";

export type DispatchLaneGrouping =
  | "crewLead"
  | "crewMember"
  | "vehicle"
  | "unassigned";
export type DispatchSeverity = "critical" | "warning" | "info";

type Assignment = {
  employeeId: string | null;
  lead: boolean;
  employee: { id: string; firstName: string; lastName: string } | null;
};
type VehicleAssignment = {
  fleetAssetId: string;
  fleetAsset: { id: string; name: string; capacityCubicYards: number | null };
};
export type BoardJob = {
  id: string;
  jobNumber: string | null;
  createdAt: Date;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  arrivalWindowEnd: Date | null;
  estimatedDurationMinutes: number | null;
  schedulingStatus: SchedulingStatus;
  priority: string;
  requiredCrewSize: number;
  conflicts: string[];
  assignments: Assignment[];
  vehicleAssignments: VehicleAssignment[];
  property: RouteAddress & { city: string; zip: string };
  estimate: {
    pricingTotal: number;
    jobSites: Array<{
      items: Array<{ estimatedVolume: number; weightClass?: string }>;
    }>;
  };
};
type Resource = {
  id: string;
  name: string;
  available: boolean;
  capacityCubicYards?: number | null;
};

export type DispatchAlert = {
  id: string;
  severity: DispatchSeverity;
  code: string;
  jobId: string;
  jobNumber: string;
  explanation: string;
  recommendedAction: string;
};

export function estimateTravelGapMinutes(
  from: Pick<BoardJob["property"], "city" | "zip">,
  to: Pick<BoardJob["property"], "city" | "zip">,
  defaultBufferMinutes = 45,
) {
  if (from.zip && from.zip === to.zip) return 15;
  if (from.city && from.city.toLowerCase() === to.city.toLowerCase()) return 30;
  return Math.max(1, defaultBufferMinutes);
}

export function projectDispatchBoard(input: {
  jobs: BoardJob[];
  unscheduled: BoardJob[];
  employees: Array<{ id: string; firstName: string; lastName: string }>;
  vehicles: Array<{
    id: string;
    name: string;
    capacityCubicYards: number | null;
  }>;
  unavailableEmployeeIds?: Set<string>;
  grouping: DispatchLaneGrouping;
  now?: Date;
  defaultTravelBufferMinutes?: number;
}) {
  const now = input.now ?? new Date();
  const unavailable = input.unavailableEmployeeIds ?? new Set<string>();
  const employeeResources: Resource[] = input.employees.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    available:
      !unavailable.has(row.id) &&
      !input.jobs.some(
        (job) =>
          active(job) &&
          job.assignments.some((item) => item.employeeId === row.id),
      ),
  }));
  const vehicleResources: Resource[] = input.vehicles.map((row) => ({
    id: row.id,
    name: row.name,
    available: !input.jobs.some(
      (job) =>
        active(job) &&
        job.vehicleAssignments.some((item) => item.fleetAssetId === row.id),
    ),
    capacityCubicYards: row.capacityCubicYards,
  }));
  const resources =
    input.grouping === "vehicle" ? vehicleResources : employeeResources;
  const lanes = [
    ...resources.map((resource) =>
      lane(
        resource.id,
        resource.name,
        resource.available,
        input.jobs.filter((job) => belongs(job, input.grouping, resource.id)),
        input.defaultTravelBufferMinutes,
        resource.capacityCubicYards,
      ),
    ),
    lane(
      "unassigned",
      "Unassigned",
      true,
      input.jobs.filter((job) => unassignedForGrouping(job, input.grouping)),
      input.defaultTravelBufferMinutes,
    ),
  ].filter(
    (row) =>
      row.jobs.length ||
      row.id !== "unassigned" ||
      input.grouping === "unassigned",
  );
  const alerts = generateDispatchAlerts(
    input.jobs,
    input.unscheduled,
    now,
    input.defaultTravelBufferMinutes,
  );
  const count = (status: SchedulingStatus) =>
    input.jobs.filter((job) => job.schedulingStatus === status).length;
  return {
    lanes,
    alerts,
    summary: {
      totalScheduled: input.jobs.length,
      tentative: count("Tentative"),
      confirmed: count("Confirmed"),
      enRoute: count("EnRoute"),
      arrived: count("Arrived"),
      inProgress: count("InProgress"),
      delayed: count("Delayed"),
      completed: count("Completed"),
      cancelled: count("Cancelled"),
      unscheduled: input.unscheduled.length,
      crewsAvailable: employeeResources.filter((row) => row.available).length,
      vehiclesAvailable: vehicleResources.filter((row) => row.available).length,
      unresolvedConflicts: alerts.filter((row) => row.severity !== "info")
        .length,
    },
  };
}

function belongs(job: BoardJob, grouping: DispatchLaneGrouping, id: string) {
  if (grouping === "vehicle")
    return job.vehicleAssignments.some((row) => row.fleetAssetId === id);
  if (grouping === "crewLead")
    return job.assignments.some((row) => row.employeeId === id && row.lead);
  if (grouping === "crewMember")
    return job.assignments.some((row) => row.employeeId === id);
  return (
    !job.assignments.some((row) => row.employeeId) &&
    !job.vehicleAssignments.length
  );
}

function unassignedForGrouping(
  job: BoardJob,
  grouping: DispatchLaneGrouping,
) {
  if (grouping === "vehicle") return !job.vehicleAssignments.length;
  if (grouping === "crewLead")
    return !job.assignments.some((row) => row.employeeId && row.lead);
  if (grouping === "crewMember")
    return !job.assignments.some((row) => row.employeeId);
  return (
    !job.assignments.some((row) => row.employeeId) &&
    !job.vehicleAssignments.length
  );
}

function lane(
  id: string,
  name: string,
  available: boolean,
  jobs: BoardJob[],
  defaultBuffer = 45,
  capacityCubicYards?: number | null,
) {
  const ordered = [...jobs].sort(
    (a, b) =>
      (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0),
  );
  const scheduledMinutes = ordered.reduce((sum, job) => sum + duration(job), 0);
  const idleGaps = ordered.slice(1).map((job, index) => {
    const previous = ordered[index];
    const minutes =
      previous.scheduledEnd && job.scheduledStart
        ? Math.max(
            0,
            (job.scheduledStart.getTime() - previous.scheduledEnd.getTime()) /
              60000,
          )
        : 0;
    return { afterJobId: previous.id, beforeJobId: job.id, minutes };
  });
  const travelRisks = idleGaps.filter(
    (gap, index) =>
      gap.minutes <
      estimateTravelGapMinutes(
        ordered[index].property,
        ordered[index + 1].property,
        defaultBuffer,
      ),
  ).length;
  const estimatedVolume = ordered.reduce(
    (sum, job) =>
      sum +
      job.estimate.jobSites
        .flatMap((site) => site.items)
        .reduce((itemSum, item) => itemSum + item.estimatedVolume, 0),
    0,
  );
  return {
    id,
    name,
    available,
    jobs: ordered,
    scheduledHours: scheduledMinutes / 60,
    jobCount: ordered.length,
    idleGaps,
    travelRisks,
    totalValue: ordered.reduce(
      (sum, job) => sum + job.estimate.pricingTotal,
      0,
    ),
    assignedCrew: new Set(
      ordered.flatMap((job) =>
        job.assignments.flatMap((row) =>
          row.employeeId ? [row.employeeId] : [],
        ),
      ),
    ).size,
    requiredCrew: ordered.reduce((sum, job) => sum + job.requiredCrewSize, 0),
    overbooked: scheduledMinutes > 10 * 60,
    estimatedVolume,
    capacityCubicYards: capacityCubicYards ?? null,
    capacityRisk: Boolean(
      capacityCubicYards && estimatedVolume > capacityCubicYards,
    ),
  };
}

export function generateDispatchAlerts(
  jobs: BoardJob[],
  unscheduled: BoardJob[],
  now = new Date(),
  defaultTravelBuffer = 45,
): DispatchAlert[] {
  const alerts: DispatchAlert[] = [];
  const add = (
    job: BoardJob,
    severity: DispatchSeverity,
    code: string,
    explanation: string,
    recommendedAction: string,
  ) =>
    alerts.push({
      id: `${job.id}:${code}`,
      severity,
      code,
      jobId: job.id,
      jobNumber: job.jobNumber ?? "Job",
      explanation,
      recommendedAction,
    });
  for (const job of jobs) {
    const startsIn = job.scheduledStart
      ? (job.scheduledStart.getTime() - now.getTime()) / 3600000
      : Number.POSITIVE_INFINITY;
    if (
      startsIn >= 0 &&
      startsIn <= 2 &&
      !job.assignments.some((row) => row.employeeId)
    )
      add(
        job,
        "critical",
        "STARTS_SOON_NO_CREW",
        "Starts within two hours without assigned crew.",
        "Assign crew",
      );
    if (startsIn >= 0 && startsIn <= 2 && !job.vehicleAssignments.length)
      add(
        job,
        "critical",
        "STARTS_SOON_NO_VEHICLE",
        "Starts within two hours without a vehicle.",
        "Assign vehicle",
      );
    if (
      job.assignments.filter((row) => row.employeeId).length <
      job.requiredCrewSize
    )
      add(
        job,
        "warning",
        "SHORT_CREW",
        "Assigned crew is below the required size.",
        "Add crew",
      );
    const volume = job.estimate.jobSites
      .flatMap((site) => site.items)
      .reduce((sum, item) => sum + item.estimatedVolume, 0);
    const assignedCapacity = job.vehicleAssignments.reduce(
      (sum, row) => sum + (row.fleetAsset.capacityCubicYards ?? 0),
      0,
    );
    if (assignedCapacity > 0 && volume > assignedCapacity)
      add(
        job,
        "warning",
        "VEHICLE_CAPACITY_RISK",
        `Estimated item volume (${volume.toFixed(1)} yd³) exceeds assigned capacity (${assignedCapacity.toFixed(1)} yd³).`,
        "Assign more capacity",
      );
    for (const conflict of job.conflicts)
      add(
        job,
        conflict.includes("Invalid") ? "critical" : "warning",
        `CONFLICT_${slug(conflict)}`,
        conflict,
        "Review schedule",
      );
    if (
      job.schedulingStatus === "Confirmed" &&
      job.scheduledEnd &&
      job.scheduledEnd < now
    )
      add(
        job,
        "critical",
        "RUNNING_LATE",
        "Confirmed job is past its scheduled end.",
        "Mark delayed or update status",
      );
    if (job.schedulingStatus === "Tentative" && startsIn >= 0 && startsIn <= 24)
      add(
        job,
        "warning",
        "UNCONFIRMED_SOON",
        "Tentative job begins within 24 hours.",
        "Confirm job",
      );
    if (
      job.arrivalWindowEnd &&
      job.arrivalWindowEnd < now &&
      !["Arrived", "InProgress", "Completed"].includes(job.schedulingStatus)
    )
      add(
        job,
        "critical",
        "ARRIVAL_WINDOW_AT_RISK",
        "Arrival window has passed.",
        "Update arrival status",
      );
  }
  const ordered = [...jobs]
    .filter((job) => job.scheduledStart && job.scheduledEnd)
    .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1],
      current = ordered[index];
    const sharedResource =
      previous.assignments.some(
        (a) =>
          a.employeeId &&
          current.assignments.some((b) => b.employeeId === a.employeeId),
      ) ||
      previous.vehicleAssignments.some((a) =>
        current.vehicleAssignments.some(
          (b) => b.fleetAssetId === a.fleetAssetId,
        ),
      );
    if (!sharedResource) continue;
    const gap =
      (current.scheduledStart!.getTime() - previous.scheduledEnd!.getTime()) /
      60000;
    const estimate = estimateTravelGapMinutes(
      previous.property,
      current.property,
      defaultTravelBuffer,
    );
    if (gap < estimate)
      add(
        current,
        "warning",
        "TRAVEL_GAP_ESTIMATE",
        `Only ${Math.max(0, Math.round(gap))} minutes between jobs; deterministic travel estimate is ${estimate} minutes.`,
        "Increase travel gap",
      );
    if (previous.schedulingStatus === "Delayed")
      add(
        current,
        "critical",
        "DELAYED_CASCADE",
        "A delayed earlier booking shares this crew or vehicle.",
        "Move or reassign job",
      );
  }
  for (const job of unscheduled) {
    const ageDays = Math.floor(
      (now.getTime() - job.createdAt.getTime()) / 86400000,
    );
    if (job.estimate.pricingTotal >= 1000)
      add(
        job,
        "warning",
        "UNSCHEDULED_HIGH_VALUE",
        "High-value job is still unscheduled.",
        "Schedule job",
      );
    if (ageDays >= 7)
      add(
        job,
        "warning",
        "UNSCHEDULED_AGED",
        `Job has been unscheduled for ${ageDays} days.`,
        "Schedule or review",
      );
  }
  return dedupe(alerts).sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
}

const active = (job: BoardJob) =>
  !["Completed", "Cancelled", "NoShow"].includes(job.schedulingStatus);
const duration = (job: BoardJob) =>
  job.estimatedDurationMinutes ??
  (job.scheduledStart && job.scheduledEnd
    ? Math.max(
        0,
        (job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 60000,
      )
    : 0);
const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const severityRank = (severity: DispatchSeverity) =>
  severity === "critical" ? 0 : severity === "warning" ? 1 : 2;
const dedupe = (alerts: DispatchAlert[]) => [
  ...new Map(alerts.map((row) => [row.id, row])).values(),
];
