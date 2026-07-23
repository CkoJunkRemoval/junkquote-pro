import {
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  FileText,
  Hourglass,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

export type DashboardKpiCounts = {
  draftEstimates: number;
  awaitingApproval: number;
  approved: number;
  scheduled: number;
  inProgress: number;
  completedToday: number;
  invoicesAwaitingPayment: number;
  paidThisMonth: number;
};

type KpiDefinition = {
  key: keyof DashboardKpiCounts;
  label: string;
  helper: string;
  icon: LucideIcon;
  href: string;
};

type KpiGroup = {
  title: string;
  columns: 2 | 3;
  items: readonly KpiDefinition[];
};

export const dashboardKpiRoutes = {
  draftEstimates: "/estimates?status=Draft",
  awaitingApproval: "/estimates?status=AwaitingApproval",
  approved: "/estimates?status=Approved",
  scheduled: "/jobs?status=Scheduled",
  inProgress: "/jobs?status=InProgress",
  completedToday: "/jobs?status=Completed&period=Today",
  invoicesAwaitingPayment: "/invoices?status=Outstanding",
  paidThisMonth: "/invoices?status=Paid&period=ThisMonth",
} as const;

const groups: readonly KpiGroup[] = [
  {
    title: "Estimate Pipeline",
    columns: 3,
    items: [
      {
        key: "draftEstimates",
        label: "Draft Estimates",
        helper: "Open pipeline",
        icon: FileText,
        href: dashboardKpiRoutes.draftEstimates,
      },
      {
        key: "awaitingApproval",
        label: "Awaiting Approval",
        helper: "Sent or viewed",
        icon: Hourglass,
        href: dashboardKpiRoutes.awaitingApproval,
      },
      {
        key: "approved",
        label: "Approved",
        helper: "Ready to schedule",
        icon: CircleCheck,
        href: dashboardKpiRoutes.approved,
      },
    ],
  },
  {
    title: "Operations",
    columns: 3,
    items: [
      {
        key: "scheduled",
        label: "Scheduled",
        helper: "Scheduled work",
        icon: CalendarDays,
        href: dashboardKpiRoutes.scheduled,
      },
      {
        key: "inProgress",
        label: "In Progress",
        helper: "Active jobs",
        icon: Truck,
        href: dashboardKpiRoutes.inProgress,
      },
      {
        key: "completedToday",
        label: "Completed Today",
        helper: "Finished today",
        icon: CheckCheck,
        href: dashboardKpiRoutes.completedToday,
      },
    ],
  },
  {
    title: "Financial",
    columns: 2,
    items: [
      {
        key: "invoicesAwaitingPayment",
        label: "Invoices Awaiting Payment",
        helper: "Outstanding balance",
        icon: Banknote,
        href: dashboardKpiRoutes.invoicesAwaitingPayment,
      },
      {
        key: "paidThisMonth",
        label: "Paid This Month",
        helper: "Received this month",
        icon: BadgeDollarSign,
        href: dashboardKpiRoutes.paidThisMonth,
      },
    ],
  },
];

export default function DashboardKpiCards({
  counts,
}: {
  counts: DashboardKpiCounts;
}) {
  return (
    <section
      aria-label="Dashboard key performance indicators"
      className="mt-7 space-y-5"
    >
      {groups.map((group) => (
        <div key={group.title}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
            {group.title}
          </h2>
          <div className={`grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 ${group.columns===3?"lg:grid-cols-3":"lg:grid-cols-2"}`}>
            {group.items.map(({ key, label, helper, icon: Icon, href }) => (
              <Link
                key={key}
                href={href}
                aria-label={`${label}: ${counts[key]}. Open filtered view.`}
                className="group relative flex min-h-32 min-w-0 cursor-pointer flex-col rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-[var(--surface-foreground)] shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-4"
              >
                <div className="flex min-h-10 items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight text-slate-700">
                    {label}
                  </h3>
                  <Icon
                    aria-hidden="true"
                    className="shrink-0 text-blue-700"
                    size={20}
                    strokeWidth={2}
                  />
                </div>
                <p className="text-3xl font-bold leading-none tabular-nums">
                  {counts[key]}
                </p>
                <div className="mt-auto flex min-h-7 items-end justify-between gap-2 pt-2">
                  <p className="text-xs font-medium text-slate-600">{helper}</p>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    size={16}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
