"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useEstimate } from "../EstimateContext";

import { buildEstimatePackage } from "@/data/output/buildEstimatePackage";
import { buildEstimatePdf } from "@/data/output/buildEstimatePdf";
import { generateEstimatePdf } from "@/data/output/generateEstimatePdf";

export default function EstimateComplete() {
  const { estimate } = useEstimate();

  const estimatePackage =
    buildEstimatePackage(estimate);

  async function handleGeneratePdf() {
    const pdf =
      buildEstimatePdf(estimatePackage);

    await generateEstimatePdf(pdf);
  }

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
              Your estimate has been created successfully.
            </p>

          </div>

          <div className="rounded-2xl bg-blue-50 p-6">

            <div className="text-sm text-slate-500">
              Estimate Number
            </div>

            <div className="mt-2 text-2xl font-bold">
              {estimatePackage.estimateNumber}
            </div>

          </div>

          <div className="rounded-2xl border p-6">

            <div className="flex justify-between">

              <span className="text-lg">
                Estimated Total
              </span>

              <span className="text-3xl font-bold text-blue-700">

                ${estimatePackage.pricing.total.toFixed(2)}

              </span>

            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <Button>
              Save Estimate
            </Button>

            <Button
              onClick={handleGeneratePdf}
            >
              Generate PDF
            </Button>

            <Button>
              Email Customer
            </Button>

            <Button>
              Start New Estimate
            </Button>

          </div>

        </div>

      </Card>

    </div>
  );
}
