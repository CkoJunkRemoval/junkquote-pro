"use server";

import {
  createProperty,
  type CreatePropertyInput,
  updatePropertyType,
} from "@/lib/properties/createProperty";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function createPropertyAction(
  input: CreatePropertyInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createProperty(companyId, input);
}
export async function updatePropertyTypeAction(propertyId: string, propertyType: string | null) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return updatePropertyType(companyId, propertyId, propertyType); }
