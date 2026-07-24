export type RouteScoreWeights = {
  travelEfficiency: number;
  idleTime: number;
  conflicts: number;
  crewUtilization: number;
  vehicleCapacity: number;
  arrivalWindowSafety: number;
  assignmentCompleteness: number;
};

export type RouteIntelligenceSettings = {
  enabled: boolean;
  roadFactor: number;
  urbanSpeedMph: number;
  suburbanSpeedMph: number;
  ruralSpeedMph: number;
  serviceAreaClass: "urban" | "suburban" | "rural";
  minimumTravelBufferMinutes: number;
  transitionBufferMinutes: number;
  defaultDifferentCityBufferMinutes: number;
  shiftStartMinutes: number;
  shiftEndMinutes: number;
  returnToBase: boolean;
  travelCountsAsUtilization: boolean;
  capacityWarningPercent: number;
  overtimeWarningMinutes: number;
  suggestionSensitivityMiles: number;
  startLocation: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  endLocation: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  scoreWeights: RouteScoreWeights;
};

export const DEFAULT_ROUTE_INTELLIGENCE_SETTINGS: RouteIntelligenceSettings = {
  enabled: true,
  roadFactor: 1.2,
  urbanSpeedMph: 25,
  suburbanSpeedMph: 35,
  ruralSpeedMph: 45,
  serviceAreaClass: "suburban",
  minimumTravelBufferMinutes: 15,
  transitionBufferMinutes: 5,
  defaultDifferentCityBufferMinutes: 45,
  shiftStartMinutes: 8 * 60,
  shiftEndMinutes: 17 * 60,
  returnToBase: false,
  travelCountsAsUtilization: false,
  capacityWarningPercent: 85,
  overtimeWarningMinutes: 30,
  suggestionSensitivityMiles: 2,
  startLocation: null,
  endLocation: null,
  scoreWeights: {
    travelEfficiency: 25,
    idleTime: 15,
    conflicts: 20,
    crewUtilization: 15,
    vehicleCapacity: 10,
    arrivalWindowSafety: 10,
    assignmentCompleteness: 5,
  },
};

export function routeIntelligenceSettings(
  value: unknown,
): RouteIntelligenceSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_ROUTE_INTELLIGENCE_SETTINGS;
  }
  const input = value as Partial<RouteIntelligenceSettings>;
  return {
    ...DEFAULT_ROUTE_INTELLIGENCE_SETTINGS,
    ...input,
    scoreWeights: {
      ...DEFAULT_ROUTE_INTELLIGENCE_SETTINGS.scoreWeights,
      ...(input.scoreWeights ?? {}),
    },
  };
}

export function validateRouteSettings(value: RouteIntelligenceSettings) {
  if (value.roadFactor < 1 || value.roadFactor > 3)
    throw new Error("Road factor must be between 1 and 3.");
  for (const speed of [
    value.urbanSpeedMph,
    value.suburbanSpeedMph,
    value.ruralSpeedMph,
  ]) {
    if (speed < 5 || speed > 80)
      throw new Error("Route speeds must be between 5 and 80 mph.");
  }
  if (value.shiftEndMinutes <= value.shiftStartMinutes)
    throw new Error("Shift end must be after shift start.");
  const total = Object.values(value.scoreWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  if (total !== 100) throw new Error("Route score weights must total 100.");
}
