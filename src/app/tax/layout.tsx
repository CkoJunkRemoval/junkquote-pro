import type { ReactNode } from "react";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export default async function TaxLayout({ children }: { children: ReactNode }) {
  await requireCompanyModulePage("tax");
  return children;
}
