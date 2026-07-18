import { prisma } from "../prisma";

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
  return prisma.property.create({
    data: {
      customerId: customer.id,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      gateCode: input.gateCode?.trim() || null,
      accessNotes: input.accessNotes?.trim() || null,
      propertyType: validatePropertyType(input.propertyType),
    },
  });
}

const propertyTypes = ["house", "apartment", "condo", "commercial", "storage", "other"];
function validatePropertyType(value?: string) { if (!value) return null; if (!propertyTypes.includes(value)) throw new Error("Unsupported property type."); return value; }
export async function updatePropertyType(companyId: string, propertyId: string, propertyType: string | null) { const property = await prisma.property.findFirst({ where: { id: propertyId, customer: { companyId } }, select: { id: true } }); if (!property) throw new Error("Property not found."); return prisma.property.update({ where: { id: property.id }, data: { propertyType: validatePropertyType(propertyType ?? undefined) } }); }
