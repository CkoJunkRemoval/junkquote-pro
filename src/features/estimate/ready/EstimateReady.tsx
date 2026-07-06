"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useEstimate } from "../EstimateContext";
import SignatureApproval from "../signature/SignatureApproval";
import { EstimateStatus } from "../status";

import { buildEstimatePackage } from "@/data/output/buildEstimatePackage";
import { buildEstimatePdf } from "@/data/output/buildEstimatePdf";
import { generateEstimatePdf } from "@/data/output/generateEstimatePdf";

export default function EstimateReady() {
  const { estimate, setStatus } = useEstimate();

  const [reviewMode, setReviewMode] =
    useState(false);

  const estimatePackage =
    buildEstimatePackage(estimate);

  function handleGeneratePdf() {
    const pdf =
      buildEstimatePdf(estimatePackage);

    generateEstimatePdf(pdf);
  }

  function handleEmailEstimate() {
    setStatus(EstimateStatus.Sent);

    alert(
      "Email delivery will be connected in the next sprint."
    );
  }

  function handleTextEstimate() {
    setStatus(EstimateStatus.Sent);

    alert(
      "Text messaging will be connected in the next sprint."
    );
  }

  function handleReviewTogether() {
    setStatus(
      EstimateStatus.PendingSignature
    );

    setReviewMode(true);
  }

  if (reviewMode) {
    return <SignatureApproval />;
  }

  return (
    <div className="space-y-8">

      <Card>

        <div className="space-y-8">

          <div className="text-center">

            <div className="text-6xl">
              📋
            </div>

            <h1 className="mt-4 text-4xl font-bold">
              Estimate Ready
            </h1>

            <p className="mt-2 text-slate-500">
              Your estimate is complete.
              Choose what you'd like to do next.
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

          <div className="rounded-xl border p-6">

            <div className="flex justify-between">

              <span>Status</span>

              <span className="font-bold text-green-600">
                {estimate.status}
              </span>

            </div>

          </div>

          <div className="rounded-xl border p-6">

            <div className="grid gap-2">

              <div className="flex justify-between">

                <span>Customer</span>

                <span className="font-medium">
                  {estimate.customer.firstName}{" "}
                  {estimate.customer.lastName}
                </span>

              </div>

              <div className="flex justify-between">

                <span>Property</span>

                <span className="font-medium">
                  {estimate.property.address}
                </span>

              </div>

              <div className="flex justify-between">

                <span>Total</span>

                <span className="text-xl font-bold text-blue-700">
                  $
                  {estimatePackage.pricing.total.toFixed(
                    2
                  )}
                </span>

              </div>

            </div>

          </div>

          <div>

            <h2 className="mb-4 text-xl font-bold">
              Deliver Estimate
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <Button
                onClick={handleEmailEstimate}
              >
                📧 Email Estimate
              </Button>

              <Button
                onClick={handleTextEstimate}
              >
                📱 Text Estimate
              </Button>

              <Button
                onClick={handleReviewTogether}
              >
                🤝 Review With Customer
              </Button>

              <Button
                onClick={handleGeneratePdf}
              >
                🖨 Generate PDF
              </Button>

            </div>

          </div>

          <div>

            <h2 className="mb-4 text-xl font-bold">
              Other Actions
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <Button>
                💾 Save Draft
              </Button>

              <Button disabled>
                📅 Schedule Job
                <span className="ml-2 text-xs">
                  (Requires Approval)
                </span>
              </Button>

            </div>

          </div>

        </div>

      </Card>

    </div>
  );
}