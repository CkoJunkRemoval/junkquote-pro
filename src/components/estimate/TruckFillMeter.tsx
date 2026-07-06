"use client";

interface TruckFillMeterProps {
  percentage: number;
  label: string;
}

export default function TruckFillMeter({
  percentage,
  label,
}: TruckFillMeterProps) {
  return (
    <div className="space-y-3">

      <div className="flex items-center justify-between">

        <h3 className="font-semibold">
          Truck Fill
        </h3>

        <span className="text-sm font-semibold text-slate-600">
          {percentage}%
        </span>

      </div>

      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      <div className="flex justify-between text-sm">

        <span className="text-slate-500">
          {label}
        </span>

        <span className="font-medium">
          {percentage}%
        </span>

      </div>

    </div>
  );
}