"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SignatureApproval() {
  const [signatureCaptured, setSignatureCaptured] =
    useState(false);

  const [deliveryMethod, setDeliveryMethod] =
    useState<"email" | "text" | "both">("email");

  return (
    <Card>

      <div className="space-y-8">

        <div>

          <h1 className="text-3xl font-bold">
            Customer Approval
          </h1>

          <p className="mt-2 text-slate-500">
            Review the estimate with the customer and
            collect their approval.
          </p>

        </div>

        <div className="rounded-xl border p-6 bg-slate-50">

          <p className="font-medium">
            Customer Signature
          </p>

          <div className="mt-4 h-56 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">

            <span className="text-slate-400">
              Signature pad will be added here
            </span>

          </div>

          <Button
            className="mt-4"
            onClick={() =>
              setSignatureCaptured(true)
            }
          >
            Simulate Signature
          </Button>

        </div>

        {signatureCaptured && (

          <>

            <div>

              <h2 className="text-xl font-bold">
                Send Signed Estimate
              </h2>

              <p className="mt-2 text-slate-500">
                Choose how the customer should receive
                their signed estimate.
              </p>

            </div>

            <div className="grid md:grid-cols-3 gap-4">

              <button
                onClick={() =>
                  setDeliveryMethod("email")
                }
                className={`rounded-xl border p-4 ${
                  deliveryMethod === "email"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                📧 Email
              </button>

              <button
                onClick={() =>
                  setDeliveryMethod("text")
                }
                className={`rounded-xl border p-4 ${
                  deliveryMethod === "text"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                📱 Text
              </button>

              <button
                onClick={() =>
                  setDeliveryMethod("both")
                }
                className={`rounded-xl border p-4 ${
                  deliveryMethod === "both"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                📧📱 Both
              </button>

            </div>

            <Button>
              Complete Approval
            </Button>

          </>

        )}

      </div>

    </Card>
  );
}