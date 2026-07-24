import { estimateTravel } from "./distance";
import {
  resolveLocation,
  type Confidence,
  type RouteAddress,
} from "./location";
import type { RouteIntelligenceSettings } from "./settings";

export type RouteJob = {
  id: string;
  jobNumber: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  arrivalWindowEnd?: Date | null;
  property: RouteAddress;
  conflicts: string[];
  assignments: Array<{ employeeId: string | null }>;
  vehicleAssignments: Array<{
    fleetAssetId: string;
    fleetAsset: {
      name: string;
      capacityCubicYards: number | null;
    };
  }>;
  estimate: {
    pricingTotal: number;
    jobSites: Array<{
      items: Array<{ estimatedVolume: number; weightClass?: string }>;
    }>;
  };
};

export type RouteStop = {
  jobId: string;
  jobNumber: string;
  location: ReturnType<typeof resolveLocation>;
  legFromPrevious: ReturnType<typeof estimateTravel> | null;
  idleMinutes: number;
  arrivalWindowRisk: boolean;
  cumulativeCubicYards: number;
  capacityPercent: number | null;
  unknownVolumeItemCount: number;
};

export type RouteSuggestion = {
  id: string;
  type:
    | "ADJACENT_SWAP"
    | "SAME_ZIP_GROUPING"
    | "NON_ADJACENT_MOVE"
    | "ASSIGN_AVAILABLE_CREW"
    | "CLOSER_AVAILABLE_CREW"
    | "CAPACITY_RESET";
  title: string;
  currentState: string;
  proposedState: string;
  reason: string;
  estimatedBenefit: string;
  confidence: Confidence;
  affectedJobIds: string[];
  proposedJobIds?: string[];
  targetEmployeeId?: string;
  targetLaneName?: string;
  warnings: string[];
};

export type RouteProjection = {
  laneId: string;
  laneName: string;
  stops: RouteStop[];
  estimatedDistanceMiles: number | null;
  estimatedTravelMinutes: number;
  scheduledWorkMinutes: number;
  idleMinutes: number;
  routeSpanMinutes: number;
  utilizationPercent: number;
  overtimeMinutes: number;
  capacityRisk: boolean;
  capacityPercent: number | null;
  confidence: Confidence;
  score: number;
  scoreLabel: "Excellent" | "Good" | "Needs Attention" | "High Risk";
  scoreBreakdown: Record<string, { earned: number; available: number }>;
  suggestions: RouteSuggestion[];
};

const confidenceRank = { High: 3, Medium: 2, Low: 1 } as const;
const lowestConfidence = (values: Confidence[]) =>
  values.reduce<Confidence>(
    (lowest, value) =>
      confidenceRank[value] < confidenceRank[lowest] ? value : lowest,
    "High",
  );
const minutesBetween = (start: Date | null, end: Date | null) =>
  start && end ? Math.max(0, (end.getTime() - start.getTime()) / 60000) : 0;
const volume = (job: RouteJob) =>
  job.estimate.jobSites
    .flatMap((site) => site.items)
    .reduce((sum, item) => sum + Math.max(0, item.estimatedVolume), 0);
const unknownVolume = (job: RouteJob) =>
  job.estimate.jobSites
    .flatMap((site) => site.items)
    .filter((item) => !(item.estimatedVolume > 0)).length;

export function scoreLabel(score: number): RouteProjection["scoreLabel"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Attention";
  return "High Risk";
}

function dimension(
  available: number,
  quality: number,
): { earned: number; available: number } {
  return {
    earned: Math.round(available * Math.max(0, Math.min(1, quality))),
    available,
  };
}

export function projectRoute(input: {
  laneId: string;
  laneName: string;
  jobs: RouteJob[];
  capacityCubicYards?: number | null;
  settings: RouteIntelligenceSettings;
  base?: RouteAddress | null;
  endBase?: RouteAddress | null;
  now?: () => number;
}): RouteProjection {
  const ordered = [...input.jobs]
    .filter((job) => job.scheduledStart && job.scheduledEnd)
    .sort(
      (left, right) =>
        left.scheduledStart!.getTime() - right.scheduledStart!.getTime(),
    );
  const base = input.base ? resolveLocation(input.base) : null;
  const endBase = input.endBase ? resolveLocation(input.endBase) : base;
  let previousLocation = base;
  let cumulativeCubicYards = 0;
  const stops: RouteStop[] = [];
  const confidence: Confidence[] = [];
  for (const [index, job] of ordered.entries()) {
    const location = resolveLocation(job.property);
    const leg = previousLocation
      ? estimateTravel(previousLocation, location, input.settings)
      : null;
    if (leg) confidence.push(leg.confidence);
    const prior = ordered[index - 1];
    const scheduleGap = prior
      ? minutesBetween(prior.scheduledEnd, job.scheduledStart)
      : 0;
    const idleMinutes = Math.max(
      0,
      scheduleGap - (leg?.estimatedTravelMinutes ?? 0),
    );
    cumulativeCubicYards += volume(job);
    const capacityPercent = input.capacityCubicYards
      ? (cumulativeCubicYards / input.capacityCubicYards) * 100
      : null;
    const projectedArrival = prior?.scheduledEnd
      ? new Date(
          prior.scheduledEnd.getTime() +
            (leg?.estimatedTravelMinutes ?? 0) * 60000,
        )
      : job.scheduledStart!;
    stops.push({
      jobId: job.id,
      jobNumber: job.jobNumber ?? "Job",
      location,
      legFromPrevious: leg,
      idleMinutes,
      arrivalWindowRisk: Boolean(
        job.arrivalWindowEnd && projectedArrival > job.arrivalWindowEnd,
      ),
      cumulativeCubicYards,
      capacityPercent,
      unknownVolumeItemCount: unknownVolume(job),
    });
    previousLocation = location;
  }
  let returnLeg: ReturnType<typeof estimateTravel> | null = null;
  if (
    input.settings.returnToBase &&
    endBase &&
    previousLocation &&
    ordered.length
  ) {
    returnLeg = estimateTravel(previousLocation, endBase, input.settings);
    confidence.push(returnLeg.confidence);
  }
  const knownLegs = stops
    .flatMap((stop) => (stop.legFromPrevious ? [stop.legFromPrevious] : []))
    .concat(returnLeg ? [returnLeg] : []);
  const estimatedDistanceMiles = knownLegs.every(
    (leg) => leg.estimatedDistanceMiles !== null,
  )
    ? knownLegs.reduce((sum, leg) => sum + (leg.estimatedDistanceMiles ?? 0), 0)
    : null;
  const estimatedTravelMinutes = knownLegs.reduce(
    (sum, leg) => sum + leg.estimatedTravelMinutes,
    0,
  );
  const scheduledWorkMinutes = ordered.reduce(
    (sum, job) => sum + minutesBetween(job.scheduledStart, job.scheduledEnd),
    0,
  );
  const idleMinutes = stops.reduce((sum, stop) => sum + stop.idleMinutes, 0);
  const firstStart = ordered[0]?.scheduledStart ?? null;
  const lastEnd = ordered.at(-1)?.scheduledEnd ?? null;
  const routeSpanMinutes = minutesBetween(firstStart, lastEnd);
  const availableShiftMinutes =
    input.settings.shiftEndMinutes - input.settings.shiftStartMinutes;
  const utilizationNumerator =
    scheduledWorkMinutes +
    (input.settings.travelCountsAsUtilization ? estimatedTravelMinutes : 0);
  const utilizationPercent =
    availableShiftMinutes > 0
      ? (utilizationNumerator / availableShiftMinutes) * 100
      : 0;
  const overtimeMinutes = Math.max(
    0,
    routeSpanMinutes +
      (returnLeg?.estimatedTravelMinutes ?? 0) -
      availableShiftMinutes,
  );
  const capacityPercent =
    input.capacityCubicYards && stops.length
      ? (stops.at(-1)!.cumulativeCubicYards / input.capacityCubicYards) * 100
      : null;
  const capacityRisk = Boolean(
    capacityPercent && capacityPercent >= input.settings.capacityWarningPercent,
  );
  const conflicts = ordered.reduce((sum, job) => sum + job.conflicts.length, 0);
  const incomplete = ordered.filter(
    (job) =>
      !job.assignments.some((row) => row.employeeId) ||
      !job.vehicleAssignments.length,
  ).length;
  const arrivalRisks = stops.filter((stop) => stop.arrivalWindowRisk).length;
  const weights = input.settings.scoreWeights;
  const breakdown = {
    travelEfficiency: dimension(
      weights.travelEfficiency,
      estimatedTravelMinutes
        ? scheduledWorkMinutes / (scheduledWorkMinutes + estimatedTravelMinutes)
        : 1,
    ),
    idleTime: dimension(
      weights.idleTime,
      routeSpanMinutes ? 1 - idleMinutes / routeSpanMinutes : 1,
    ),
    conflicts: dimension(weights.conflicts, conflicts ? 0 : 1),
    crewUtilization: dimension(
      weights.crewUtilization,
      utilizationPercent > 100
        ? Math.max(0, 1 - (utilizationPercent - 100) / 50)
        : Math.min(1, utilizationPercent / 75),
    ),
    vehicleCapacity: dimension(
      weights.vehicleCapacity,
      capacityPercent === null
        ? 0.6
        : capacityPercent > 100
          ? 0
          : capacityPercent >= 35
            ? 1
            : capacityPercent / 35,
    ),
    arrivalWindowSafety: dimension(
      weights.arrivalWindowSafety,
      stops.length ? 1 - arrivalRisks / stops.length : 1,
    ),
    assignmentCompleteness: dimension(
      weights.assignmentCompleteness,
      ordered.length ? 1 - incomplete / ordered.length : 1,
    ),
  };
  const score = Object.values(breakdown).reduce(
    (sum, row) => sum + row.earned,
    0,
  );
  const suggestions = evaluateSuggestions({
    jobs: ordered,
    settings: input.settings,
    capacityRisk,
    capacityPercent,
    now: input.now,
  });
  return {
    laneId: input.laneId,
    laneName: input.laneName,
    stops,
    estimatedDistanceMiles,
    estimatedTravelMinutes,
    scheduledWorkMinutes,
    idleMinutes,
    routeSpanMinutes,
    utilizationPercent,
    overtimeMinutes,
    capacityRisk,
    capacityPercent,
    confidence: confidence.length
      ? lowestConfidence(confidence)
      : ("Low" as const),
    score,
    scoreLabel: scoreLabel(score),
    scoreBreakdown: breakdown,
    suggestions,
  };
}

export const ROUTE_OPTIMIZER_LIMITS = {
  jobsPerLane: 12,
  suggestionsPerLane: 5,
  lanesPerDay: 20,
  timeBudgetMs: 25,
} as const;

function estimatedRouteMiles(
  jobs: RouteJob[],
  settings: RouteIntelligenceSettings,
  base?: RouteAddress | null,
) {
  const orderedLocations = [
    ...(base ? [resolveLocation(base)] : []),
    ...jobs.map((job) => resolveLocation(job.property)),
  ];
  let miles = 0;
  for (let index = 1; index < orderedLocations.length; index += 1) {
    const travel = estimateTravel(
      orderedLocations[index - 1],
      orderedLocations[index],
      settings,
    );
    if (travel.estimatedDistanceMiles === null) return null;
    miles += travel.estimatedDistanceMiles;
  }
  return miles;
}

export function evaluateSuggestions(input: {
  jobs: RouteJob[];
  settings: RouteIntelligenceSettings;
  capacityRisk?: boolean;
  capacityPercent?: number | null;
  now?: () => number;
}) {
  const now = input.now ?? Date.now;
  const started = now();
  const jobs = input.jobs.slice(0, ROUTE_OPTIMIZER_LIMITS.jobsPerLane);
  const suggestions: RouteSuggestion[] = [];
  const routeMiles = (ordered: RouteJob[]) =>
    estimatedRouteMiles(ordered, input.settings);
  const currentMiles = routeMiles(jobs);
  for (let index = 0; index < jobs.length - 1; index += 1) {
    if (
      suggestions.length >= ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane ||
      now() - started > ROUTE_OPTIMIZER_LIMITS.timeBudgetMs
    )
      break;
    const left = jobs[index];
    const right = jobs[index + 1];
    if (left.conflicts.length || right.conflicts.length) continue;
    const swapped = [...jobs];
    [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
    const proposedMiles = routeMiles(swapped);
    const benefit =
      currentMiles !== null && proposedMiles !== null
        ? currentMiles - proposedMiles
        : 0;
    const sameZipGrouping =
      index > 0 &&
      jobs[index - 1].property.zip === right.property.zip &&
      left.property.zip !== right.property.zip;
    if (benefit < input.settings.suggestionSensitivityMiles && !sameZipGrouping)
      continue;
    suggestions.push({
      id: `swap:${left.id}:${right.id}`,
      type: sameZipGrouping ? "SAME_ZIP_GROUPING" : "ADJACENT_SWAP",
      title: sameZipGrouping
        ? "Group nearby ZIP stops"
        : "Consider swapping adjacent jobs",
      currentState: `${left.jobNumber ?? "Job"} then ${right.jobNumber ?? "Job"}`,
      proposedState: `${right.jobNumber ?? "Job"} then ${left.jobNumber ?? "Job"}`,
      reason: sameZipGrouping
        ? "Places matching ZIP areas together."
        : "Reduces the coordinate-based route estimate.",
      estimatedBenefit:
        benefit > 0
          ? `About ${benefit.toFixed(1)} estimated miles`
          : "Improved ZIP grouping; distance unavailable",
      confidence:
        currentMiles !== null && proposedMiles !== null ? "Medium" : "Low",
      affectedJobIds: [left.id, right.id],
      warnings: [
        "Preview and conflict validation required before schedule changes.",
      ],
    });
  }
  for (let from = 0; from < jobs.length; from += 1) {
    if (
      suggestions.length >= ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane ||
      now() - started > ROUTE_OPTIMIZER_LIMITS.timeBudgetMs
    )
      break;
    for (let to = 0; to < jobs.length; to += 1) {
      if (Math.abs(from - to) < 2) continue;
      const moving = jobs[from];
      if (moving.conflicts.length) continue;
      const proposed = [...jobs];
      proposed.splice(from, 1);
      proposed.splice(to, 0, moving);
      const proposedMiles = routeMiles(proposed);
      const benefit =
        currentMiles !== null && proposedMiles !== null
          ? currentMiles - proposedMiles
          : 0;
      if (benefit < input.settings.suggestionSensitivityMiles) continue;
      suggestions.push({
        id: `move:${moving.id}:${from}:${to}`,
        type: "NON_ADJACENT_MOVE",
        title: "Move a stop within this route",
        currentState: `${moving.jobNumber ?? "Job"} is stop ${from + 1}`,
        proposedState: `${moving.jobNumber ?? "Job"} becomes stop ${to + 1}`,
        reason: "A bounded non-adjacent move reduces estimated route distance.",
        estimatedBenefit: `About ${benefit.toFixed(1)} estimated miles`,
        confidence: "Medium",
        affectedJobIds: jobs.map((job) => job.id),
        proposedJobIds: proposed.map((job) => job.id),
        warnings: [
          "Preview and conflict validation required before schedule changes.",
        ],
      });
      break;
    }
  }
  if (
    input.capacityRisk &&
    suggestions.length < ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane
  ) {
    suggestions.push({
      id: `capacity:${jobs.at(-1)?.id ?? "lane"}`,
      type: "CAPACITY_RESET",
      title: "Review dump/reset stop",
      currentState: `${(input.capacityPercent ?? 0).toFixed(0)}% estimated capacity`,
      proposedState: "Add a dump or reset before the final capacity threshold",
      reason: "Cumulative estimated volume reaches the warning threshold.",
      estimatedBenefit: "Reduces likely overload risk",
      confidence: jobs.some((job) => unknownVolume(job)) ? "Low" : "Medium",
      affectedJobIds: jobs.map((job) => job.id),
      warnings: ["Advisory only; item volumes may be incomplete."],
    });
  }
  return suggestions;
}

export function evaluateCrewAssignmentSuggestions(input: {
  lanes: Array<{
    employeeId: string;
    laneName: string;
    unavailable: boolean;
    jobs: RouteJob[];
  }>;
  unassignedJobs: RouteJob[];
  settings: RouteIntelligenceSettings;
  base?: RouteAddress | null;
  now?: () => number;
}) {
  const now = input.now ?? Date.now;
  const started = now();
  const lanes = input.lanes
    .filter((lane) => !lane.unavailable)
    .slice(0, ROUTE_OPTIMIZER_LIMITS.lanesPerDay);
  const suggestions: RouteSuggestion[] = [];
  const ordered = (jobs: RouteJob[]) =>
    [...jobs]
      .filter((job) => job.scheduledStart && job.scheduledEnd)
      .sort(
        (left, right) =>
          left.scheduledStart!.getTime() - right.scheduledStart!.getTime(),
      )
      .slice(0, ROUTE_OPTIMIZER_LIMITS.jobsPerLane);
  const overlaps = (left: RouteJob, right: RouteJob) =>
    Boolean(
      left.scheduledStart &&
        left.scheduledEnd &&
        right.scheduledStart &&
        right.scheduledEnd &&
        left.scheduledStart < right.scheduledEnd &&
        left.scheduledEnd > right.scheduledStart,
    );
  const insertion = (laneJobs: RouteJob[], candidate: RouteJob) => {
    if (laneJobs.some((job) => overlaps(job, candidate))) return null;
    const current = estimatedRouteMiles(laneJobs, input.settings, input.base);
    const withCandidate = estimatedRouteMiles(
      ordered([...laneJobs, candidate]),
      input.settings,
      input.base,
    );
    if (current === null || withCandidate === null) return null;
    return withCandidate - current;
  };

  for (const candidate of input.unassignedJobs.slice(
    0,
    ROUTE_OPTIMIZER_LIMITS.jobsPerLane,
  )) {
    if (
      suggestions.length >= ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane ||
      now() - started > ROUTE_OPTIMIZER_LIMITS.timeBudgetMs
    )
      break;
    const options = lanes
      .map((lane) => ({
        lane,
        addedMiles: insertion(ordered(lane.jobs), candidate),
      }))
      .filter(
        (option): option is { lane: (typeof lanes)[number]; addedMiles: number } =>
          option.addedMiles !== null,
      )
      .sort(
        (left, right) =>
          left.addedMiles - right.addedMiles ||
          left.lane.employeeId.localeCompare(right.lane.employeeId),
      );
    const best = options[0];
    if (!best) continue;
    suggestions.push({
      id: `assign:${candidate.id}:${best.lane.employeeId}`,
      type: "ASSIGN_AVAILABLE_CREW",
      title: "Assign an available crew lead",
      currentState: `${candidate.jobNumber ?? "Job"} has no assigned crew`,
      proposedState: `Assign to ${best.lane.laneName}`,
      reason:
        "This available lane has no overlapping job and the lowest estimated insertion distance.",
      estimatedBenefit: `Adds about ${best.addedMiles.toFixed(1)} estimated miles`,
      confidence: "Medium",
      affectedJobIds: [candidate.id],
      targetEmployeeId: best.lane.employeeId,
      targetLaneName: best.lane.laneName,
      warnings: ["Final schedule and availability validation is required."],
    });
  }

  for (const source of lanes) {
    for (const candidate of ordered(source.jobs)) {
      if (
        suggestions.length >= ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane ||
        now() - started > ROUTE_OPTIMIZER_LIMITS.timeBudgetMs
      )
        break;
      const sourceWithout = ordered(
        source.jobs.filter((job) => job.id !== candidate.id),
      );
      const currentAdded = insertion(sourceWithout, candidate);
      if (currentAdded === null) continue;
      const alternatives = lanes
        .filter((lane) => lane.employeeId !== source.employeeId)
        .map((lane) => ({
          lane,
          addedMiles: insertion(ordered(lane.jobs), candidate),
        }))
        .filter(
          (
            option,
          ): option is {
            lane: (typeof lanes)[number];
            addedMiles: number;
          } => option.addedMiles !== null,
        )
        .sort(
          (left, right) =>
            left.addedMiles - right.addedMiles ||
            left.lane.employeeId.localeCompare(right.lane.employeeId),
        );
      const best = alternatives[0];
      if (
        !best ||
        currentAdded - best.addedMiles <
          input.settings.suggestionSensitivityMiles
      )
        continue;
      suggestions.push({
        id: `closer:${candidate.id}:${best.lane.employeeId}`,
        type: "CLOSER_AVAILABLE_CREW",
        title: "Use a closer available crew lead",
        currentState: `${candidate.jobNumber ?? "Job"} is assigned to ${source.laneName}`,
        proposedState: `Assign to ${best.lane.laneName}`,
        reason:
          "The alternate lane is free during this job and has a lower estimated route insertion cost.",
        estimatedBenefit: `About ${(currentAdded - best.addedMiles).toFixed(1)} estimated miles`,
        confidence: "Medium",
        affectedJobIds: [candidate.id],
        targetEmployeeId: best.lane.employeeId,
        targetLaneName: best.lane.laneName,
        warnings: [
          "Reassignment replaces the current employee assignment after final validation.",
        ],
      });
    }
  }
  return suggestions;
}

export function summarizeRoutes(routes: RouteProjection[]) {
  const total = (pick: (route: RouteProjection) => number) =>
    routes.reduce((sum, route) => sum + pick(route), 0);
  const distanceKnown = routes.every(
    (route) => route.estimatedDistanceMiles !== null,
  );
  return {
    routeScore: routes.length
      ? Math.round(total((route) => route.score) / routes.length)
      : 100,
    estimatedMiles: distanceKnown
      ? total((route) => route.estimatedDistanceMiles ?? 0)
      : null,
    estimatedDriveMinutes: total((route) => route.estimatedTravelMinutes),
    scheduledWorkMinutes: total((route) => route.scheduledWorkMinutes),
    idleMinutes: total((route) => route.idleMinutes),
    crewUtilizationPercent: routes.length
      ? total((route) => route.utilizationPercent) / routes.length
      : 0,
    capacityRisks: routes.filter((route) => route.capacityRisk).length,
    overtimeRisks: routes.filter((route) => route.overtimeMinutes > 0).length,
    suggestionCount: total((route) => route.suggestions.length),
  };
}
