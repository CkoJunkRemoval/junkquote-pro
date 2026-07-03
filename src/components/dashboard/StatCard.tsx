import Card from "../ui/Card";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
}: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-all">

      <p className="text-sm uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <h2 className="text-4xl font-bold text-slate-900 mt-3">
        {value}
      </h2>

      {subtitle && (
        <p className="text-sm text-slate-500 mt-3">
          {subtitle}
        </p>
      )}

    </Card>
  );
}