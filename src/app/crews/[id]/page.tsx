import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { getCrewDetail } from "@/lib/crews/management";
import CrewDetailManager from "@/features/crews/CrewDetailManager";
export default async function CrewDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const crew = await getCrewDetail(id); if (!crew) notFound(); return <AppLayout><CrewDetailManager initialCrew={crew} /></AppLayout>; }
