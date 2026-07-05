"use client";

import { JobSite } from "../types";

interface AreaSummaryProps {
  jobSite: JobSite;
}

export default function AreaSummary({
  jobSite,
}: AreaSummaryProps) {
  const itemCount = jobSite.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const photoCount = jobSite.photos.length;

  const noteCount =
    [
      jobSite.customerNotes,
      jobSite.crewNotes,
      jobSite.internalNotes,
    ].filter((note) => note.trim().length > 0).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Area Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Current Area
        </p>

        <h3 className="mt-2 text-2xl font-bold">
          {jobSite.name}
        </h3>

        <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {jobSite.status.replace("-", " ")}
        </div>
      </div>

      <div className="space-y-4">

        <div className="flex justify-between">
          <span className="text-slate-600">
            Items Selected
          </span>

          <span className="font-semibold">
            {itemCount}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Photos
          </span>

          <span className="font-semibold">
            {photoCount}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Notes
          </span>

          <span className="font-semibold">
            {noteCount}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Area Status
          </span>

          <span className="font-semibold capitalize">
            {jobSite.status.replace("-", " ")}
          </span>
        </div>

        <hr className="my-4" />

        <div className="flex justify-between text-lg font-bold">
          <span>Subtotal</span>

          <span>
            ${jobSite.subtotal.toFixed(2)}
          </span>
        </div>

      </div>

    </div>
  );
}