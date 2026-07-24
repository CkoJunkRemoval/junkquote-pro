import { describe, expect, it } from "vitest";
import { estimateTravelGapMinutes, generateDispatchAlerts, projectDispatchBoard, type BoardJob } from "./board";

const job = (extra: Partial<BoardJob> = {}): BoardJob => ({
  id: "job-1", jobNumber: "JOB-1", createdAt: new Date("2026-08-01T12:00:00Z"),
  scheduledStart: new Date("2026-08-10T13:00:00Z"), scheduledEnd: new Date("2026-08-10T15:00:00Z"),
  arrivalWindowEnd: null, estimatedDurationMinutes: 120, schedulingStatus: "Scheduled", priority: "Normal",
  requiredCrewSize: 1, conflicts: [], assignments: [{ employeeId: "employee-1", lead: true, employee: { id: "employee-1", firstName: "Alex", lastName: "Crew" } }],
  vehicleAssignments: [{ fleetAssetId: "vehicle-1", fleetAsset: { id: "vehicle-1", name: "Truck", capacityCubicYards: 16 } }],
  property: { city: "Richmond", zip: "23220" }, estimate: { pricingTotal: 500, jobSites: [{ items: [{ estimatedVolume: 4 }] }] }, ...extra,
});

describe("dispatch board projections", () => {
  it("groups lanes by crew and vehicle with workload totals", () => {
    const base = { jobs: [job()], unscheduled: [], employees: [{ id: "employee-1", firstName: "Alex", lastName: "Crew" }], vehicles: [{ id: "vehicle-1", name: "Truck", capacityCubicYards: 16 }] };
    expect(projectDispatchBoard({ ...base, grouping: "crewLead" }).lanes[0]).toMatchObject({ id: "employee-1", jobCount: 1, scheduledHours: 2 });
    expect(projectDispatchBoard({ ...base, grouping: "vehicle" }).lanes[0]).toMatchObject({ id: "vehicle-1", jobCount: 1 });
  });
  it("keeps resource-unassigned jobs visible in the relevant lane", () => {
    const base = {
      jobs: [job({ assignments: [] })],
      unscheduled: [],
      employees: [{ id: "employee-1", firstName: "Alex", lastName: "Crew" }],
      vehicles: [{ id: "vehicle-1", name: "Truck", capacityCubicYards: 16 }],
    };
    expect(
      projectDispatchBoard({ ...base, grouping: "crewLead" }).lanes.find(
        (lane) => lane.id === "unassigned",
      )?.jobs,
    ).toHaveLength(1);
  });
  it("uses transparent deterministic travel estimates", () => {
    expect(estimateTravelGapMinutes({ city: "A", zip: "1" }, { city: "B", zip: "1" })).toBe(15);
    expect(estimateTravelGapMinutes({ city: "A", zip: "1" }, { city: "a", zip: "2" })).toBe(30);
    expect(estimateTravelGapMinutes({ city: "A", zip: "1" }, { city: "B", zip: "2" }, 50)).toBe(50);
  });
  it("generates delayed cascade, travel, aged, and high-value alerts", () => {
    const first = job({ schedulingStatus: "Delayed" });
    const second = job({ id: "job-2", jobNumber: "JOB-2", scheduledStart: new Date("2026-08-10T15:10:00Z"), scheduledEnd: new Date("2026-08-10T16:10:00Z"), property: { city: "Norfolk", zip: "23510" } });
    const unscheduled = job({ id: "job-3", scheduledStart: null, scheduledEnd: null, estimate: { pricingTotal: 1500, jobSites: [] } });
    const codes = generateDispatchAlerts([first, second], [unscheduled], new Date("2026-08-10T12:00:00Z")).map((row) => row.code);
    expect(codes).toEqual(expect.arrayContaining(["DELAYED_CASCADE", "TRAVEL_GAP_ESTIMATE", "UNSCHEDULED_HIGH_VALUE", "UNSCHEDULED_AGED"]));
  });
});
