import type { ReactNode } from "react";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  await requireCompanyModulePage("finance");
  return children;
}
