"use client";

import Card from "@/components/ui/Card";

import { useEstimate } from "@/features/estimate/EstimateContext";

import { calculateEstimate } from "@/data/pricing/calculateEstimate";
import { calculateTruckFill } from "@/data/pricing/calculateTruckFill";

import TruckFillMeter from "./TruckFillMeter";

export default function EstimateSummary() {
  const { estimate } = useEstimate();

  const totals = calculateEstimate(estimate);

  const truckFill = calculateTruckFill(
    totals.truckVolume
  );

  return (
    <Card>
      <div className="space-y-6">

        <div>
          <h2 className="text-2xl font-bold">
            Estimate Summary
          </h2>

          <p className="mt-1 text-slate-500">
            Live estimate overview
          </p>
        </div>

        <TruckFillMeter
          percentage={truckFill.percentage}
          label={truckFill.label}
        />

        <div className="space-y-4">

          <div className="flex justify-between">
            <span>Areas</span>

            <strong>
              {estimate.jobSites.length}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Items</span>

            <strong>
              {totals.itemCount}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Heavy Items</span>

            <strong>
              {totals.heavyItems}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Truck Volume</span>

            <strong>
              {totals.truckVolume}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Recommended Crew</span>

            <strong>
              {totals.recommendedCrew}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Labor Hours</span>

            <strong>
              {totals.laborHours}
            </strong>
          </div>

          <hr />

          <div className="flex justify-between">
            <span>Base Price</span>

            <strong>
              ${totals.basePrice.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Disposal Fees</span>

            <strong>
              ${totals.disposalFees.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Minimum Charge</span>

            <strong>
              ${totals.minimumCharge.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Labor</span>

            <strong>
              ${totals.labor.toFixed(2)}
            </strong>
          </div>

          <div className="flex justify-between">
            <span>Tax</span>

            <strong>
              ${totals.tax.toFixed(2)}
            </strong>
          </div>

        </div>

        <hr />

        <div className="rounded-xl bg-blue-50 p-4">

          <div className="flex justify-between items-center">

            <span className="text-lg font-semibold">
              Estimated Total
            </span>

            <span className="text-3xl font-bold text-blue-700">
              ${totals.total.toFixed(2)}
            </span>

          </div>

        </div>

      </div>
    </Card>
  );
}