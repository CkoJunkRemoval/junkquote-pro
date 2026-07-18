import AppLayout from "@/components/layout/AppLayout";
import EstimatesWorkspace from "@/features/estimate/EstimatesWorkspace";
import { Suspense } from "react";
export default function EstimatesPage() { return <AppLayout><Suspense fallback={<div className="p-8" role="status">Loading estimates…</div>}><EstimatesWorkspace /></Suspense></AppLayout>; }
