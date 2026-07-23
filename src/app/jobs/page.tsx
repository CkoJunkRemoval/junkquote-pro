import AppLayout from "@/components/layout/AppLayout";
import JobManagement from "@/features/jobs/JobManagement";
import {parseJobManagementFilter,parseJobManagementPeriod} from "@/features/jobs/jobListFilters";

export default async function JobsPage({searchParams}:{searchParams:Promise<{status?:string;period?:string}>}) { const query=await searchParams;return <AppLayout><JobManagement initialFilter={parseJobManagementFilter(query.status)} initialPeriod={parseJobManagementPeriod(query.period)} /></AppLayout>; }
