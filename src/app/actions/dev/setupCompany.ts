"use server";

import { getDevelopmentCompany } from "@/lib/dev/company";

export async function setupDevelopmentCompany() {
  return getDevelopmentCompany();
}