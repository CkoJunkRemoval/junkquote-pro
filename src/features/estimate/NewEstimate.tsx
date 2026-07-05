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

import CustomerScreen from "./steps/CustomerScreen";
import PropertyScreen from "./steps/PropertyScreen";
import JobSiteScreen from "./steps/JobSiteScreen";
import WalkthroughScreen from "./steps/WalkthroughScreen";

function EstimateWizard() {
  const [step, setStep] = useState(1);

  const { estimate } = useEstimate();

  function nextStep() {
    switch (step) {
      case 1:
        if (!estimate.customerType) return;
        break;

      case 2:
        if (!estimate.property.type) return;
        if (!estimate.property.address.trim()) return;
        break;

      case 3:
        if (estimate.jobSites.length === 0) return;
        break;
    }

    if (step < 7) {
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
        return <CustomerScreen />;

      case 2:
        return <PropertyScreen />;

      case 3:
        return <JobSiteScreen />;

      case 4:
        return <WalkthroughScreen />;

      case 5:
        return (
          <div className="py-12">
            <h2 className="text-3xl font-bold">
              Pricing Engine
            </h2>

            <p className="mt-3 text-slate-500">
              Automatic pricing will appear here.
            </p>
          </div>
        );

      case 6:
        return (
          <div className="py-12">
            <h2 className="text-3xl font-bold">
              Review Estimate
            </h2>

            <p className="mt-3 text-slate-500">
              Review everything before sending it to the customer.
            </p>
          </div>
        );

      case 7:
        return (
          <div className="py-12">
            <h2 className="text-3xl font-bold">
              Customer Approval
            </h2>

            <p className="mt-3 text-slate-500">
              Signature and approval coming next.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <StepHeader
        step={step}
        totalSteps={7}
        title="New Estimate"
        description="Let's build an estimate."
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            {renderStep()}

            <div className="mt-10 flex justify-between">
              <Button
                onClick={previousStep}
                disabled={step === 1}
              >
                Back
              </Button>

              <Button onClick={nextStep}>
                {step === 7 ? "Finish" : "Continue"}
              </Button>
            </div>
          </Card>
        </div>

        <EstimateSummary />
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