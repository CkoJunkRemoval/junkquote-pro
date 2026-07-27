import type { ReactNode } from "react";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export default async function FleetLayout({ children }: { children: ReactNode }) {
  await requireCompanyModulePage("fleet");
  return children;
}
