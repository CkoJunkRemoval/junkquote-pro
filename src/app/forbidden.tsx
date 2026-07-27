import AppLayout from "@/components/layout/AppLayout";
import AccessDenied from "@/components/auth/AccessDenied";

export default function Forbidden() {
  return (
    <AppLayout>
      <AccessDenied />
    </AppLayout>
  );
}
