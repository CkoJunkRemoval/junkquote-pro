"use client";

import Card from "@/components/ui/Card";

import { useEstimate } from "@/features/estimate/EstimateContext";

import { calculateEstimate } from "@/data/pricing/calculateEstimate";

export default function EstimateSummary() {
  const { estimate } = useEstimate();

  const totals = calculateEstimate(estimate);

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

        <div className="flex justify-between text-2xl font-bold">

          <span>Estimated Total</span>

          <span>
            ${totals.total.toFixed(2)}
          </span>

        </div>

      </div>
    </Card>
  );
}