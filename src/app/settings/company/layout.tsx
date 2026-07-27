import AppLayout from "@/components/layout/AppLayout";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";

export default async function CompanyHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompanyModulePage("companyHub");
  return <AppLayout>{children}</AppLayout>;
}
