import ComparisonPage from "@/components/marketing/ComparisonPage";
import { comparisonPages } from "@/lib/marketing/comparison";
import { marketingMetadata } from "@/lib/marketing/metadata";

const data = comparisonPages["housecall-pro"];
export const metadata = marketingMetadata("/vs-housecall-pro", data.title, data.description);
export default function HousecallProComparisonPage() { return <ComparisonPage data={data} />; }
