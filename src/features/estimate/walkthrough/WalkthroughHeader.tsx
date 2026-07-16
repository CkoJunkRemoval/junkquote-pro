"use client";

import { JobSite } from "../types";

interface WalkthroughHeaderProps {
  current: number;
  total: number;
  area: JobSite;
}

export default function WalkthroughHeader({
  current,
  total,
  area,
}: WalkthroughHeaderProps) {
  const progress = (current / total) * 100;

  const status = area.status === "completed"
    ? "Completed"
    : "In Progress";

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm uppercase tracking-wider text-slate-500">
            Walkthrough
          </p>

          <h1 className="text-4xl font-bold">
            {area.name}
          </h1>

          <p className="mt-2 text-slate-500">
            Area {current} of {total}
          </p>

        </div>

        <div className="text-right">

          <p className="text-sm text-slate-500">
            Status
          </p>

          <p className="text-lg font-semibold">
            {status}
          </p>

        </div>

      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>
  );
}
