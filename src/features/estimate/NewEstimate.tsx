"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StepHeader from "@/components/estimate/StepHeader";
import EstimateSummary from "@/components/estimate/EstimateSummary";

import {
  EstimateProvider,
  useEstimate,
} from "./EstimateContext";

import CustomerStep from "./steps/CustomerScreen";
import PropertyStep from "./steps/PropertyScreen";
import JobSiteStep from "./steps/JobSiteScreen";
import ItemsStep from "./steps/ItemsScreen";

import ReviewEstimate from "./review/ReviewEstimate";
import EstimateReady from "./ready/EstimateReady";

function EstimateWizard() {
  const [step, setStep] = useState(1);

  const { estimate, estimateId } = useEstimate();
  const customerName = [
    estimate.customer.firstName,
    estimate.customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  function nextStep() {
    switch (step) {
      case 1:
        if (!estimate.customerType) return;
        if (!estimate.customer.firstName.trim()) return;
        if (!estimate.customer.lastName.trim()) return;
        if (!estimate.customer.phone.trim()) return;
        break;

      case 2:
        if (!estimate.property.type) return;
        if (!estimate.property.address.trim()) return;
        break;

      case 3:
        if (estimate.jobSites.length === 0) return;
        break;
    }

    if (step < 6) {
      setStep((current) => current + 1);
    }
  }

  function previousStep() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  function renderStep() {
    switch (step) {
      case 1:
        return <CustomerStep />;

      case 2:
        return <PropertyStep />;

      case 3:
        return <JobSiteStep />;

      case 4:
        return <ItemsStep />;

      case 5:
        return <ReviewEstimate />;

      case 6:
        return <EstimateReady />;

      default:
        return null;
    }
  }

  const showSidebar = step <= 4;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">

      <StepHeader
        step={step}
        totalSteps={6}
        title="New Estimate"
        description="Create a professional estimate."
        estimateId={estimateId}
        customerName={customerName}
      />

      <div
        className={`grid gap-8 ${
          showSidebar
            ? "grid-cols-1 xl:grid-cols-3"
            : "grid-cols-1"
        }`}
      >

        <div
          className={
            showSidebar
              ? "xl:col-span-2"
              : "w-full"
          }
        >

          <Card>

            {renderStep()}

            <div className="mt-10 flex justify-between">

              <Button
                onClick={previousStep}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < 6 && (
                <Button onClick={nextStep}>
                  Continue
                </Button>
              )}

            </div>

          </Card>

        </div>

        {showSidebar && (
          <EstimateSummary />
        )}

      </div>

    </div>
  );
}

export default function NewEstimate() {
  return (
    <EstimateProvider>
      <EstimateWizard />
    </EstimateProvider>
  );
}
