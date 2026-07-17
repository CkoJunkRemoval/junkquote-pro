"use server";

import {
  createProperty,
  type CreatePropertyInput,
} from "@/lib/properties/createProperty";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function createPropertyAction(
  input: CreatePropertyInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createProperty(companyId, input);
}
