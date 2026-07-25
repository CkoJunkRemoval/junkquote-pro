import AppLayout from "@/components/layout/AppLayout";

export default function CompanyHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
