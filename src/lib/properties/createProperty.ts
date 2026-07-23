import { prisma } from "../prisma";
import { normalizeAddress } from "./properties";

export interface CreatePropertyInput {
  customerId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  gateCode?: string;
  accessNotes?: string;
  propertyType?: string;
}

export async function createProperty(companyId: string, input: CreatePropertyInput) {
  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, companyId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found.");
  const normalizedAddress = normalizeAddress({ ...input, country: "US" });
  const duplicate = await prisma.property.findFirst({ where: { normalizedAddress, customer: { companyId } }, select: { id: true } });
  if (duplicate) throw new Error("A property with this address already exists.");
  return prisma.property.create({
    data: {
      customerId: customer.id,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      normalizedAddress,
      gateCode: input.gateCode?.trim() || null,
      accessNotes: input.accessNotes?.trim() || null,
      propertyType: validatePropertyType(input.propertyType),
    },
  });
}

const propertyTypeMap: Record<string, string> = { house: "Residential", condo: "Residential", apartment: "Apartment", commercial: "Commercial", storage: "Storage Unit", other: "Other" };
function validatePropertyType(value?: string) { if (!value) return null; const normalized = propertyTypeMap[value.toLowerCase()] ?? value; if (!["Residential", "Apartment", "Commercial", "Storage Unit", "Construction Site", "Rental Property", "Other"].includes(normalized)) throw new Error("Unsupported property type."); return normalized; }
export async function updatePropertyType(companyId: string, propertyId: string, propertyType: string | null) { const property = await prisma.property.findFirst({ where: { id: propertyId, customer: { companyId } }, select: { id: true } }); if (!property) throw new Error("Property not found."); return prisma.property.update({ where: { id: property.id }, data: { propertyType: validatePropertyType(propertyType ?? undefined) } }); }
