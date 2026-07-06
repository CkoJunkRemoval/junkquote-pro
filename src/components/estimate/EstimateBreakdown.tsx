"use client";

import Card from "@/components/ui/Card";

import { useEstimate } from "@/features/estimate/EstimateContext";

import { buildEstimateBreakdown } from "@/data/pricing/buildEstimateBreakdown";

export default function EstimateBreakdown() {
  const { estimate } = useEstimate();

  const rows = buildEstimateBreakdown(estimate);

  return (
    <Card>

      <div className="space-y-6">

        <div>

          <h2 className="text-2xl font-bold">
            Estimate Breakdown
          </h2>

          <p className="mt-1 text-slate-500">
            Itemized estimate
          </p>

        </div>

        {rows.length === 0 ? (

          <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
            No items selected.
          </div>

        ) : (

          <div className="space-y-4">

            {rows.map((row, index) => (

              <div
                key={index}
                className="rounded-xl border p-4"
              >

                <div className="flex justify-between">

                  <div>

                    <h3 className="font-semibold">
                      {row.itemName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {row.area}
                    </p>

                  </div>

                  <div className="text-right">

                    <div className="font-semibold">
                      ${row.totalPrice.toFixed(2)}
                    </div>

                    <div className="text-sm text-slate-500">
                      {row.quantity} × ${row.unitPrice.toFixed(2)}
                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </Card>
  );
}