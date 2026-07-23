"use client";
import { useSearchParams } from "next/navigation";
import NewEstimate from "./NewEstimate";
import EstimateManagement from "./EstimateManagement";
import {parseEstimateManagementStatus} from "./estimateListFilters";
export default function EstimatesWorkspace() { const params = useSearchParams(); return params.get("new") === "1" || params.has("estimateId") ? <NewEstimate /> : <EstimateManagement initialStatus={parseEstimateManagementStatus(params.get("status"))} />; }
