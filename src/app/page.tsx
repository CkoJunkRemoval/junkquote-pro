import AppLayout from "@/components/layout/AppLayout";
import BusinessPulse from "@/components/dashboard/BusinessPulse";
import QuickActionCard from "@/components/dashboard/QuickActionCard";
import StatCard from "@/components/dashboard/StatCard";
import TodaysSchedule from "@/components/dashboard/TodaysSchedule";

export default function Home() {
  return (
    <AppLayout>
      <div className="p-10">

        <h1 className="text-5xl font-bold text-slate-900">
          Good Evening, Chris
        </h1>

        <p className="text-slate-500 mt-3 text-lg">
          Here's your business at a glance.
        </p>

        {/* Quick Actions */}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mt-10">

          <QuickActionCard
            title="New Estimate"
            description="Create a new estimate."
            href="/estimate"
          />

          <QuickActionCard
            title="Continue Working"
            description="Resume an unfinished estimate."
          />

          <QuickActionCard
            title="Today's Jobs"
            description="View today's schedule."
          />

          <QuickActionCard
            title="Customers"
            description="Find customers and history."
          />

        </div>

        {/* Business Snapshot */}

        <h2 className="text-2xl font-bold mt-14 mb-6">
          Business Snapshot
        </h2>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">

          <StatCard
            title="Revenue Today"
            value="$0"
            subtitle="No payments yet"
          />

          <StatCard
            title="Jobs Today"
            value="3"
            subtitle="2 remaining"
          />

          <StatCard
            title="Draft Estimates"
            value="1"
            subtitle="Ready to continue"
          />

          <StatCard
            title="Pending Approval"
            value="2"
            subtitle="Awaiting customers"
          />

        </div>

        {/* Bottom Row */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-14">

          <BusinessPulse />

          <TodaysSchedule />

        </div>

      </div>
    </AppLayout>
  );
}