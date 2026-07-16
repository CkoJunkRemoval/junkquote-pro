"use server";

import {
  createProperty,
  type CreatePropertyInput,
} from "@/lib/properties/createProperty";

export async function createPropertyAction(
  input: CreatePropertyInput
) {
  return createProperty(input);
}
