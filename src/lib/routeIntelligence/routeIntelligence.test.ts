import { describe, expect, it } from "vitest";
import { estimateTravel, geodesicMiles } from "./distance";
import {
  evaluateSuggestions,
  evaluateCrewAssignmentSuggestions,
  projectRoute,
  ROUTE_OPTIMIZER_LIMITS,
  scoreLabel,
  summarizeRoutes,
  type RouteJob,
} from "./engine";
import {
  lookupZipCentroid,
  resolveLocation,
  ZIP_DATASET_METADATA,
} from "./location";
import {
  DEFAULT_ROUTE_INTELLIGENCE_SETTINGS as settings,
  routeIntelligenceSettings,
  validateRouteSettings,
} from "./settings";

const time = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 7, 10, hour, minute));
const job = (
  id: string,
  zip: string,
  startHour: number,
  endHour: number,
  overrides: Partial<RouteJob> = {},
): RouteJob => ({
  id,
  jobNumber: id.toUpperCase(),
  scheduledStart: time(startHour),
  scheduledEnd: time(endHour),
  arrivalWindowEnd: null,
  property: { city: "Richmond", state: "VA", zip },
  conflicts: [],
  assignments: [{ employeeId: "employee-1" }],
  vehicleAssignments: [
    {
      fleetAssetId: "truck-1",
      fleetAsset: { name: "Truck 1", capacityCubicYards: 14 },
    },
  ],
  estimate: {
    pricingTotal: 500,
    jobSites: [{ items: [{ estimatedVolume: 4, weightClass: "Medium" }] }],
  },
  ...overrides,
});

describe("route intelligence locations and distance", () => {
  it("uses exact coordinates with high confidence", () => {
    expect(
      resolveLocation({
        latitude: 37.5,
        longitude: -77.4,
        zip: "23220",
      }),
    ).toMatchObject({
      source: "Exact coordinates",
      confidence: "High",
    });
  });

  it("uses the sourced ZIP fixture with metadata", () => {
    expect(lookupZipCentroid("23220-1234")).toEqual(
      expect.objectContaining({ latitude: 37.549349 }),
    );
    expect(ZIP_DATASET_METADATA).toEqual({
      source: "U.S. Census Bureau 2024 ZCTA Gazetteer",
      version: "2024",
    });
  });

  it("falls back transparently for city/state and incomplete addresses", () => {
    expect(
      resolveLocation({ city: "Roanoke", state: "VA", zip: "24000" }),
    ).toMatchObject({
      source: "City/state approximation",
      confidence: "Low",
      latitude: null,
    });
    expect(resolveLocation({})).toMatchObject({
      source: "Fixed buffer",
      confidence: "Low",
    });
  });

  it("calculates haversine and road-factor estimates", () => {
    const from = resolveLocation({ zip: "23220" });
    const to = resolveLocation({ zip: "23510" });
    const straight = geodesicMiles(from, to)!;
    const result = estimateTravel(from, to, settings);
    expect(straight).toBeGreaterThan(75);
    expect(result.estimatedDistanceMiles).toBeCloseTo(
      straight * settings.roadFactor,
      5,
    );
    expect(result.reason).toContain("road factor");
    expect(result.confidence).toBe("Medium");
  });

  it("uses deterministic same-city and fixed travel buffers", () => {
    const from = resolveLocation({ city: "Roanoke", state: "VA" });
    const sameCity = estimateTravel(
      from,
      resolveLocation({ city: "roanoke", state: "VA" }),
      settings,
    );
    const different = estimateTravel(
      from,
      resolveLocation({ city: "Blacksburg", state: "VA" }),
      settings,
    );
    expect(sameCity.estimatedTravelMinutes).toBe(35);
    expect(different.estimatedTravelMinutes).toBe(50);
    expect(different.confidence).toBe("Low");
  });
});

describe("daily route projection", () => {
  it("calculates sequence, idle, utilization, capacity, and score", () => {
    const route = projectRoute({
      laneId: "truck-1",
      laneName: "Truck 1",
      jobs: [job("one", "23220", 13, 15), job("two", "23223", 16, 18)],
      capacityCubicYards: 14,
      settings,
    });
    expect(route.stops).toHaveLength(2);
    expect(route.scheduledWorkMinutes).toBe(240);
    expect(route.idleMinutes).toBeGreaterThanOrEqual(0);
    expect(route.utilizationPercent).toBeCloseTo((240 / 540) * 100);
    expect(route.capacityPercent).toBeCloseTo((8 / 14) * 100);
    expect(route.score).toBeGreaterThanOrEqual(0);
    expect(route.score).toBeLessThanOrEqual(100);
    expect(Object.values(route.scoreBreakdown)).toHaveLength(7);
  });

  it("supports return-to-base, overtime, and arrival-window risk", () => {
    const route = projectRoute({
      laneId: "crew-1",
      laneName: "Crew 1",
      jobs: [
        job("one", "23220", 13, 19),
        job("two", "23510", 19, 22, {
          arrivalWindowEnd: time(19, 5),
        }),
      ],
      capacityCubicYards: 20,
      settings: { ...settings, returnToBase: true },
      base: { zip: "23220", city: "Richmond", state: "VA" },
    });
    expect(route.estimatedTravelMinutes).toBeGreaterThan(0);
    expect(route.overtimeMinutes).toBeGreaterThan(0);
    expect(route.stops[1].arrivalWindowRisk).toBe(true);
  });

  it("handles unknown volume without blocking projection", () => {
    const route = projectRoute({
      laneId: "truck-1",
      laneName: "Truck",
      jobs: [
        job("one", "23220", 13, 14, {
          estimate: {
            pricingTotal: 10,
            jobSites: [{ items: [{ estimatedVolume: 0 }] }],
          },
        }),
      ],
      capacityCubicYards: null,
      settings,
    });
    expect(route.stops[0].unknownVolumeItemCount).toBe(1);
    expect(route.capacityPercent).toBeNull();
  });

  it("labels score bands and summarizes lanes", () => {
    expect([
      scoreLabel(95),
      scoreLabel(80),
      scoreLabel(65),
      scoreLabel(30),
    ]).toEqual(["Excellent", "Good", "Needs Attention", "High Risk"]);
    const route = projectRoute({
      laneId: "lane",
      laneName: "Lane",
      jobs: [job("one", "23220", 13, 14)],
      settings,
    });
    expect(summarizeRoutes([route])).toMatchObject({
      routeScore: route.score,
      scheduledWorkMinutes: 60,
    });
  });
});

describe("bounded deterministic suggestions and settings", () => {
  it("suggests same-ZIP grouping without changing jobs", () => {
    const jobs = [
      job("one", "23220", 13, 14),
      job("two", "23510", 14, 15),
      job("three", "23220", 15, 16),
    ];
    const result = evaluateSuggestions({
      jobs,
      settings: { ...settings, suggestionSensitivityMiles: 0 },
    });
    expect(result.some((row) => row.type === "SAME_ZIP_GROUPING")).toBe(true);
    expect(jobs.map((row) => row.id)).toEqual(["one", "two", "three"]);
  });

  it("adds capacity reset advice with low confidence for unknown items", () => {
    const result = evaluateSuggestions({
      jobs: [
        job("one", "23220", 13, 14, {
          estimate: {
            pricingTotal: 1,
            jobSites: [{ items: [{ estimatedVolume: 0 }] }],
          },
        }),
      ],
      settings,
      capacityRisk: true,
      capacityPercent: 110,
    });
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "CAPACITY_RESET",
        confidence: "Low",
      }),
    );
  });

  it("suggests a bounded non-adjacent move that reduces distance", () => {
    const result = evaluateSuggestions({
      jobs: [
        job("one", "23220", 13, 14),
        job("two", "23510", 14, 15),
        job("three", "23510", 15, 16),
        job("four", "23220", 16, 17),
      ],
      settings: { ...settings, suggestionSensitivityMiles: 1 },
    });
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "NON_ADJACENT_MOVE",
        proposedJobIds: expect.any(Array),
      }),
    );
  });

  it("assigns an unassigned job to the available lane with lowest insertion cost", () => {
    const candidate = job("unassigned", "23510", 15, 16);
    const result = evaluateCrewAssignmentSuggestions({
      lanes: [
        {
          employeeId: "richmond",
          laneName: "Richmond Crew",
          unavailable: false,
          jobs: [job("rva", "23220", 13, 14)],
        },
        {
          employeeId: "norfolk",
          laneName: "Norfolk Crew",
          unavailable: false,
          jobs: [job("orf", "23510", 13, 14)],
        },
      ],
      unassignedJobs: [candidate],
      settings,
    });
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "ASSIGN_AVAILABLE_CREW",
        affectedJobIds: ["unassigned"],
        targetEmployeeId: "norfolk",
      }),
    );
  });

  it("suggests a closer non-overlapping crew deterministically", () => {
    const candidate = job("candidate", "23510", 15, 16);
    const result = evaluateCrewAssignmentSuggestions({
      lanes: [
        {
          employeeId: "richmond",
          laneName: "Richmond Crew",
          unavailable: false,
          jobs: [job("rva", "23220", 13, 14), candidate],
        },
        {
          employeeId: "norfolk",
          laneName: "Norfolk Crew",
          unavailable: false,
          jobs: [job("orf", "23510", 13, 14)],
        },
      ],
      unassignedJobs: [],
      settings: { ...settings, suggestionSensitivityMiles: 1 },
    });
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "CLOSER_AVAILABLE_CREW",
        affectedJobIds: ["candidate"],
        targetEmployeeId: "norfolk",
      }),
    );
  });

  it("enforces job, suggestion, and time budgets", () => {
    let clock = 0;
    const result = evaluateSuggestions({
      jobs: Array.from({ length: 30 }, (_, index) =>
        job(
          String(index),
          index % 2 ? "23220" : "23223",
          13 + index,
          14 + index,
        ),
      ),
      settings: { ...settings, suggestionSensitivityMiles: 0 },
      now: () => (clock += 30),
    });
    expect(result.length).toBeLessThanOrEqual(
      ROUTE_OPTIMIZER_LIMITS.suggestionsPerLane,
    );
  });

  it("merges safe settings and validates score weights", () => {
    expect(routeIntelligenceSettings({ roadFactor: 1.4 }).roadFactor).toBe(1.4);
    expect(() =>
      validateRouteSettings({
        ...settings,
        scoreWeights: { ...settings.scoreWeights, conflicts: 19 },
      }),
    ).toThrow("total 100");
  });
});
