import ComparisonPage from "@/components/marketing/ComparisonPage";
import { comparisonPages } from "@/lib/marketing/comparison";
import { marketingMetadata } from "@/lib/marketing/metadata";

const data = comparisonPages.junkiq;
export const metadata = marketingMetadata("/vs-junkiq", data.title, data.description);
export default function JunkIqComparisonPage() { return <ComparisonPage data={data} />; }
