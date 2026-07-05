"use client";

interface AreaSummaryProps {
  areaName: string;
}

export default function AreaSummary({
  areaName,
}: AreaSummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <h2 className="text-xl font-semibold">
        Area Summary
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Current Area
      </p>

      <h3 className="mt-2 text-2xl font-bold">
        {areaName}
      </h3>

      <div className="mt-8 space-y-4">

        <div className="flex justify-between">
          <span className="text-slate-600">
            Items Selected
          </span>

          <span className="font-semibold">
            0
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Photos
          </span>

          <span className="font-semibold">
            0
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Notes
          </span>

          <span className="font-semibold">
            0
          </span>
        </div>

        <hr />

        <div className="flex justify-between text-lg font-bold">
          <span>Subtotal</span>

          <span>$0.00</span>
        </div>

      </div>

    </div>
  );
}