import fixture from "./zip-centroids.fixture.json";

export type Confidence = "High" | "Medium" | "Low";
export type RouteAddress = {
  address?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
export type ResolvedLocation = {
  latitude: number | null;
  longitude: number | null;
  confidence: Confidence;
  source:
    | "Exact coordinates"
    | "ZIP centroid"
    | "City/state approximation"
    | "Fixed buffer";
  explanation: string;
  city: string;
  state: string;
  zip: string;
};

type FixtureRow = [string, number, number, string, string];
const centroids = new Map(
  (fixture.rows as FixtureRow[]).map(
    ([zip, latitude, longitude, city, state]) => [
      zip,
      { latitude, longitude, city, state },
    ],
  ),
);

export const ZIP_DATASET_METADATA = {
  source: fixture.source,
  version: fixture.version,
};

export function lookupZipCentroid(zip: string | null | undefined) {
  const normalized = zip?.match(/\d{5}/)?.[0];
  return normalized ? (centroids.get(normalized) ?? null) : null;
}

export function resolveLocation(address: RouteAddress): ResolvedLocation {
  const city = address.city?.trim() ?? "";
  const state = address.state?.trim().toUpperCase() ?? "";
  const zip = address.zip?.match(/\d{5}/)?.[0] ?? "";
  if (Number.isFinite(address.latitude) && Number.isFinite(address.longitude)) {
    return {
      latitude: address.latitude!,
      longitude: address.longitude!,
      confidence: "High",
      source: "Exact coordinates",
      explanation: "Stored property coordinates",
      city,
      state,
      zip,
    };
  }
  const centroid = lookupZipCentroid(zip);
  if (centroid) {
    return {
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      confidence: "Medium",
      source: "ZIP centroid",
      explanation: `${ZIP_DATASET_METADATA.source} (${ZIP_DATASET_METADATA.version})`,
      city: city || centroid.city,
      state: state || centroid.state,
      zip,
    };
  }
  if (city && state) {
    return {
      latitude: null,
      longitude: null,
      confidence: "Low",
      source: "City/state approximation",
      explanation: "Deterministic city/state fallback; no coordinate lookup",
      city,
      state,
      zip,
    };
  }
  return {
    latitude: null,
    longitude: null,
    confidence: "Low",
    source: "Fixed buffer",
    explanation: "Address is incomplete; configured travel buffer used",
    city,
    state,
    zip,
  };
}
