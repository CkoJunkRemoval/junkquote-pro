export type DispatchJob = {
  id: string;
  status: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  completedAt?: Date | null;
  priority: string;
  assignments: Array<{
    crew: { id: string; name: string; active?: boolean } | null;
    employee: { id: string; firstName: string; lastName: string } | null;
  }>;
  invoice?: { total: number; balanceDue: number; status: string } | null;
};
export function calculateDispatchMetrics(
  jobs: DispatchJob[],
  revenueToday: number,
  now = new Date(),
) {
  const completed = jobs.filter((job) => job.status === "Completed");
  const durations = completed.flatMap((job) =>
    job.scheduledStart && (job.completedAt ?? job.scheduledEnd)
      ? [
          ((job.completedAt ?? job.scheduledEnd)!.getTime() -
            job.scheduledStart.getTime()) /
            60000,
        ]
      : [],
  );
  return {
    jobsToday: jobs.length,
    revenueToday,
    pendingInvoices: jobs.filter(
      (job) =>
        !job.invoice ||
        ["Draft", "Sent", "Partial", "Overdue"].includes(job.invoice.status),
    ).length,
    unpaidBalance: jobs.reduce(
      (sum, job) => sum + (job.invoice?.balanceDue ?? 0),
      0,
    ),
    completedJobs: completed.length,
    averageJobDuration: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0,
    activeCrews: new Set(
      jobs.flatMap((job) =>
        job.assignments.flatMap((a) => (a.crew ? [a.crew.id] : [])),
      ),
    ).size,
    jobsBehindSchedule: jobs.filter(
      (job) =>
        job.status !== "Completed" &&
        job.status !== "Cancelled" &&
        job.scheduledEnd &&
        job.scheduledEnd < now,
    ).length,
  };
}
export function calculateCrewWorkload(jobs: DispatchJob[], capacityHours = 8) {
  const crews = new Map<
    string,
    {
      crewId: string;
      name: string;
      assignedHours: number;
      windows: Array<{ start: Date; end: Date }>;
    }
  >();
  for (const job of jobs) {
    if (!job.scheduledStart || !job.scheduledEnd || job.status === "Cancelled")
      continue;
    for (const assignment of job.assignments) {
      if (!assignment.crew) continue;
      const current = crews.get(assignment.crew.id) ?? {
        crewId: assignment.crew.id,
        name: assignment.crew.name,
        assignedHours: 0,
        windows: [],
      };
      current.assignedHours +=
        (job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 3600000;
      current.windows.push({
        start: job.scheduledStart,
        end: job.scheduledEnd,
      });
      crews.set(current.crewId, current);
    }
  }
  return [...crews.values()].map((crew) => {
    const sorted = crew.windows.sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const idleGapHours = sorted
      .slice(1)
      .reduce(
        (sum, window, index) =>
          sum +
          Math.max(
            0,
            (window.start.getTime() - sorted[index].end.getTime()) / 3600000,
          ),
        0,
      );
    const overlaps = sorted
      .slice(1)
      .filter((window, index) => window.start < sorted[index].end).length;
    return {
      ...crew,
      estimatedCompletion: sorted.at(-1)?.end ?? null,
      remainingCapacity: Math.max(0, capacityHours - crew.assignedHours),
      idleGapHours,
      overlaps,
      overloaded: crew.assignedHours > capacityHours,
      idle: crew.assignedHours === 0,
    };
  });
}
export function filterDispatchJobs<
  T extends DispatchJob & {
    customer: { firstName: string; lastName: string };
    servicePlanId?: string | null;
    estimator?: { id: string } | null;
  },
>(
  jobs: T[],
  filters: {
    crewId?: string;
    employeeId?: string;
    estimatorId?: string;
    status?: string;
    priority?: string;
    recurring?: string;
    customer?: string;
  },
) {
  const customer = filters.customer?.toLowerCase();
  return jobs.filter(
    (job) =>
      (!filters.crewId ||
        job.assignments.some((a) => a.crew?.id === filters.crewId)) &&
      (!filters.employeeId ||
        job.assignments.some((a) => a.employee?.id === filters.employeeId)) &&
      (!filters.estimatorId || job.estimator?.id === filters.estimatorId) &&
      (!filters.status || job.status === filters.status) &&
      (!filters.priority || job.priority === filters.priority) &&
      (!filters.recurring ||
        (filters.recurring === "yes") === Boolean(job.servicePlanId)) &&
      (!customer ||
        `${job.customer.firstName} ${job.customer.lastName}`
          .toLowerCase()
          .includes(customer)),
  );
}
