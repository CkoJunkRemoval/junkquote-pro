"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StepHeader from "@/components/estimate/StepHeader";

import {
  EstimateProvider,
  useEstimate,
} from "./EstimateContext";

function EstimateWizard() {
  const [step, setStep] = useState(1);

  const { estimate, setEstimate } = useEstimate();

  function nextStep() {
    if (step < 7) {
      setStep(step + 1);
    }
  }

  function previousStep() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <StepHeader
        step={step}
        totalSteps={7}
        title="New Estimate"
        description="Let's build an estimate."
      />

      <Card>
        {step === 1 && (
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() =>
                setEstimate({
                  ...estimate,
                  customerType: "existing",
                })
              }
              className={`rounded-2xl border p-8 text-left transition ${
                estimate.customerType === "existing"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-300 hover:border-blue-500"
              }`}
            >
              <h2 className="text-2xl font-bold">
                Existing Customer
              </h2>

              <p className="mt-3 text-slate-500">
                Search your customer database.
              </p>
            </button>

            <button
              onClick={() =>
                setEstimate({
                  ...estimate,
                  customerType: "new",
                })
              }
              className={`rounded-2xl border p-8 text-left transition ${
                estimate.customerType === "new"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-300 hover:border-blue-500"
              }`}
            >
              <h2 className="text-2xl font-bold">
                New Customer
              </h2>

              <p className="mt-3 text-slate-500">
                Create a new customer.
              </p>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="py-10">
            <h2 className="text-3xl font-bold">
              Property Information
            </h2>

            <p className="text-slate-500 mt-3">
              This step will collect the property details.
            </p>

            <div className="mt-8 rounded-xl bg-slate-100 p-6">
              <p>
                Customer Type:
                <strong className="ml-2">
                  {estimate.customerType}
                </strong>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10">
          <Button onClick={previousStep}>
            Back
          </Button>

          <Button
            onClick={nextStep}
            disabled={!estimate.customerType}
          >
            Continue
          </Button>
        </div>
      </Card>
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