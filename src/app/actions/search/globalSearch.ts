"use server";

import { requireTenantContext } from "@/lib/auth/tenant";
import { globalSearch } from "@/lib/globalSearch/search";

export async function globalSearchAction(query: string) {
  const context = await requireTenantContext();
  return globalSearch({ companyId: context.companyId, userId: context.user.id, role: context.role }, query);
}
