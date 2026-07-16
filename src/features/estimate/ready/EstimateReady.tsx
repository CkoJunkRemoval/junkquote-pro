"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { buildEstimatePackage } from "@/data/output/buildEstimatePackage";
import { buildEstimatePdf } from "@/data/output/buildEstimatePdf";
import { generateEstimatePdf } from "@/data/output/generateEstimatePdf";
import { statusTransitions } from "@/lib/estimates/statusWorkflow";

import { useEstimate } from "../EstimateContext";
import { EstimateStatus } from "../status";

export default function EstimateReady() {
  const { estimate, setStatus } = useEstimate();
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const estimatePackage = buildEstimatePackage(estimate);
  const availableTransitions = statusTransitions[estimate.status];

  async function changeStatus(nextStatus: EstimateStatus) {
    setIsSavingStatus(true);
    setStatusError(null);

    try {
      await setStatus(nextStatus);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to update estimate status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Estimate Workflow</h1>
            <p className="mt-2 text-slate-500">
              Advance this estimate when it reaches the next stage.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-6">
            <div className="text-sm text-slate-500">Estimate Number</div>
            <div className="mt-2 text-2xl font-bold">{estimatePackage.estimateNumber}</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
            <div className="text-sm font-medium uppercase tracking-wide text-slate-600">
              Current Status
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-800">
              {estimate.status}
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium">
                  {estimate.customer.firstName} {estimate.customer.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Property</span>
                <span className="font-medium">{estimate.property.address}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-xl font-bold text-blue-700">
                  ${estimatePackage.pricing.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-bold">Status Controls</h2>
            {availableTransitions.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {availableTransitions.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    disabled={isSavingStatus}
                    onClick={() => void changeStatus(status as EstimateStatus)}
                  >
                    {isSavingStatus ? "Saving..." : `Mark ${status}`}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No further status transitions are available.</p>
            )}
            {statusError && <p className="mt-3 text-red-600">{statusError}</p>}
          </div>

          <Button type="button" onClick={() => generateEstimatePdf(buildEstimatePdf(estimatePackage))}>
            Generate PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
