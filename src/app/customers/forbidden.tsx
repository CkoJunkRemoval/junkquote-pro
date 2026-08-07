import AppLayout from "@/components/layout/AppLayout";
import AccessDenied from "@/components/auth/AccessDenied";

export default function CustomerForbidden() {
  return <AppLayout><AccessDenied /></AppLayout>;
}
