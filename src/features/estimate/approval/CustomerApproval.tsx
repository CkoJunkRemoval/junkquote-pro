"use client";

import Card from "@/components/ui/Card";

import { useEstimate } from "../EstimateContext";

import { calculateEstimate } from "@/data/pricing/calculateEstimate";

export default function CustomerApproval() {
  const { estimate } = useEstimate();

  const totals = calculateEstimate(estimate);

  return (
    <div className="space-y-8">

      <Card>

        <div className="space-y-6">

          <div>

            <h1 className="text-3xl font-bold">
              Customer Approval
            </h1>

            <p className="mt-2 text-slate-500">
              Please review the estimate before signing.
            </p>

          </div>

          <div className="rounded-xl bg-blue-50 p-6">

            <div className="text-sm text-slate-500">
              Estimated Total
            </div>

            <div className="mt-2 text-5xl font-bold text-blue-700">
              ${totals.total.toFixed(2)}
            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <div>

              <h3 className="font-semibold">
                Customer
              </h3>

              <div className="mt-2 text-slate-600">

                {estimate.customer.firstName}{" "}
                {estimate.customer.lastName}

              </div>

            </div>

            <div>

              <h3 className="font-semibold">
                Property
              </h3>

              <div className="mt-2 text-slate-600">

                {estimate.property.address}

              </div>

            </div>

          </div>

          <div className="rounded-xl border p-6">

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                className="h-5 w-5"
              />

              <span>
                I approve this estimate and authorize
                CKO Junk Removal to perform the work.
              </span>

            </label>

          </div>

          <div>

            <h3 className="font-semibold">
              Customer Signature
            </h3>

            <div className="mt-4 h-28 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">

              Signature Pad Coming Next Sprint

            </div>

          </div>

        </div>

      </Card>

    </div>
  );
}