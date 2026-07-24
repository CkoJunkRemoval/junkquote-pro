import type { ResolvedLocation } from "./location";
import type { RouteIntelligenceSettings } from "./settings";

const EARTH_RADIUS_MILES = 3958.7613;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function geodesicMiles(
  from: Pick<ResolvedLocation, "latitude" | "longitude">,
  to: Pick<ResolvedLocation, "latitude" | "longitude">,
) {
  if (
    from.latitude === null ||
    from.longitude === null ||
    to.latitude === null ||
    to.longitude === null
  )
    return null;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

const rank = { High: 3, Medium: 2, Low: 1 } as const;
const lowerConfidence = (
  left: ResolvedLocation["confidence"],
  right: ResolvedLocation["confidence"],
) => (rank[left] <= rank[right] ? left : right);

export function estimateTravel(
  from: ResolvedLocation,
  to: ResolvedLocation,
  settings: RouteIntelligenceSettings,
) {
  const straightLineMiles = geodesicMiles(from, to);
  if (straightLineMiles !== null) {
    const estimatedDistanceMiles = straightLineMiles * settings.roadFactor;
    const speed =
      settings.serviceAreaClass === "urban"
        ? settings.urbanSpeedMph
        : settings.serviceAreaClass === "rural"
          ? settings.ruralSpeedMph
          : settings.suburbanSpeedMph;
    const estimatedTravelMinutes = Math.max(
      settings.minimumTravelBufferMinutes,
      Math.ceil((estimatedDistanceMiles / speed) * 60) +
        settings.transitionBufferMinutes,
    );
    return {
      straightLineMiles,
      estimatedDistanceMiles,
      estimatedTravelMinutes,
      confidence: lowerConfidence(from.confidence, to.confidence),
      reason: `${from.source} to ${to.source}; ${settings.roadFactor.toFixed(2)} road factor and ${speed} mph ${settings.serviceAreaClass} speed`,
    };
  }
  const sameZip = Boolean(from.zip && from.zip === to.zip);
  const sameCity = Boolean(
    from.city &&
      to.city &&
      from.state === to.state &&
      from.city.toLowerCase() === to.city.toLowerCase(),
  );
  const estimatedTravelMinutes = sameZip
    ? settings.minimumTravelBufferMinutes
    : sameCity
      ? Math.max(settings.minimumTravelBufferMinutes, 30)
      : settings.defaultDifferentCityBufferMinutes;
  return {
    straightLineMiles: null,
    estimatedDistanceMiles: null,
    estimatedTravelMinutes:
      estimatedTravelMinutes + settings.transitionBufferMinutes,
    confidence: "Low" as const,
    reason: sameZip
      ? "Same-ZIP fallback"
      : sameCity
        ? "Same-city/state fallback"
        : "Configured different-city buffer",
  };
}
