import Link from "next/link";
import Card from "../ui/Card";

type QuickActionCardProps = {
  title: string;
  description: string;
  href?: string;
};

export default function QuickActionCard({
  title,
  description,
  href = "#",
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
        <h2 className="text-xl font-bold text-slate-800">
          {title}
        </h2>

        <p className="text-slate-500 mt-2">
          {description}
        </p>
      </Card>
    </Link>
  );
}