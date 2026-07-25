export const locationInput = (input: Record<string, FormDataEntryValue>) => {
  const required = (key: string) => {
    const value = String(input[key] ?? "").trim();
    if (!value) throw new Error(`${key} is required.`);
    return value;
  };
  const email = String(input.email ?? "").trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email))
    throw new Error("Enter a valid location email.");
  return {
    name: required("name"),
    addressLine1: required("addressLine1"),
    addressLine2: String(input.addressLine2 ?? "").trim() || null,
    city: required("city"),
    state: required("state"),
    postalCode: required("postalCode"),
    phone: String(input.phone ?? "").trim() || null,
    email: email || null,
    managerId: String(input.managerId ?? "").trim() || null,
    hours: String(input.hours ?? "").trim()
      ? { summary: String(input.hours).trim() }
      : {},
    active: input.active !== "false",
  };
};

export const serviceAreaInput = (input: Record<string, FormDataEntryValue>) => {
  const kind = String(input.kind ?? "").trim().toUpperCase();
  if (!["ZIP", "CITY", "COUNTY", "RADIUS"].includes(kind))
    throw new Error("Select a valid service-area type.");
  const value = String(input.value ?? "").trim();
  if (!value) throw new Error("Service-area value is required.");
  const radiusMiles = input.radiusMiles ? Number(input.radiusMiles) : null;
  const distanceCharge = Number(input.distanceCharge ?? 0);
  if (radiusMiles !== null && (!Number.isFinite(radiusMiles) || radiusMiles < 0))
    throw new Error("Radius cannot be negative.");
  if (!Number.isFinite(distanceCharge) || distanceCharge < 0)
    throw new Error("Travel surcharge cannot be negative.");
  return {
    kind,
    value,
    radiusMiles,
    distanceCharge,
    available: input.available !== "false",
    locationId: String(input.locationId ?? "").trim() || null,
  };
};
