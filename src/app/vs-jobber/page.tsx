import ComparisonPage from "@/components/marketing/ComparisonPage";
import { comparisonPages } from "@/lib/marketing/comparison";
import { marketingMetadata } from "@/lib/marketing/metadata";

const data = comparisonPages.jobber;
export const metadata = marketingMetadata("/vs-jobber", data.title, data.description);
export default function JobberComparisonPage() { return <ComparisonPage data={data} />; }
