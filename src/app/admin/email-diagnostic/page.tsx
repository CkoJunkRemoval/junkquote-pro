import AppLayout from "@/components/layout/AppLayout";
import EmailDiagnostic from "@/features/admin/EmailDiagnostic";
import { requireCompanyRole } from "@/lib/auth/tenant";
export default async function Page() {
  await requireCompanyRole("Owner", "Admin");
  return (
    <AppLayout>
      <main className="p-6">
        <EmailDiagnostic />
      </main>
    </AppLayout>
  );
}
