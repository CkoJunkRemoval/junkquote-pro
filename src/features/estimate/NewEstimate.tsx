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
import CustomerApproval from "./approval/CustomerApproval";
import EstimateComplete from "./complete/EstimateComplete";

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

    if (step < 8) {
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
        return (
          <div className="py-12">
            <h2 className="text-3xl font-bold">
              Pricing Engine
            </h2>

            <p className="mt-3 text-slate-500">
              Automatic pricing is now being calculated behind the scenes.
            </p>
          </div>
        );

      case 6:
        return <ReviewEstimate />;

      case 7:
        return <CustomerApproval />;

      case 8:
        return <EstimateComplete />;

      default:
        return null;
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <StepHeader
        step={step}
        totalSteps={8}
        title="New Estimate"
        description="Let's build an estimate."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

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
                {step === 8
                  ? "Done"
                  : step === 7
                  ? "Finish"
                  : "Continue"}
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