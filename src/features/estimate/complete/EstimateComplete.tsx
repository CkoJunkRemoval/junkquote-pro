"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useEstimate } from "../EstimateContext";

import { calculateEstimate } from "@/data/pricing/calculateEstimate";

export default function EstimateComplete() {
  const { estimate } = useEstimate();

  const totals = calculateEstimate(estimate);

  const estimateNumber =
    "CKO-" +
    new Date().getFullYear() +
    "-" +
    Math.floor(Math.random() * 90000 + 10000);

  return (
    <div className="space-y-8">

      <Card>

        <div className="space-y-8">

          <div className="text-center">

            <div className="text-6xl">
              ✅
            </div>

            <h1 className="mt-4 text-4xl font-bold">
              Estimate Complete
            </h1>

            <p className="mt-3 text-slate-500">
              The estimate has been successfully created.
            </p>

          </div>

          <div className="rounded-2xl bg-blue-50 p-6">

            <div className="text-sm text-slate-500">
              Estimate Number
            </div>

            <div className="mt-2 text-2xl font-bold">
              {estimateNumber}
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

              <div className="text-slate-600">
                {estimate.customer.phone}
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

          <div className="rounded-2xl border p-6">

            <div className="flex justify-between">

              <span className="text-lg">
                Final Estimate
              </span>

              <span className="text-3xl font-bold text-blue-700">

                ${totals.total.toFixed(2)}

              </span>

            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <Button>
              Save Estimate
            </Button>

            <Button>
              Generate PDF
            </Button>

            <Button>
              Email Customer
            </Button>

            <Button>
              New Estimate
            </Button>

          </div>

        </div>

      </Card>

    </div>
  );
}