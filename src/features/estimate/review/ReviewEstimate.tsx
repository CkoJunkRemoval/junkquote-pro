"use client";

import Card from "@/components/ui/Card";

import { useEstimate } from "../EstimateContext";

import EstimateSummary from "@/components/estimate/EstimateSummary";
import EstimateBreakdown from "@/components/estimate/EstimateBreakdown";
import SmartPricingPanel from "../smartPricing/SmartPricingPanel";

export default function ReviewEstimate() {
  const { estimate } = useEstimate();

  return (
    <div className="space-y-8">

      <Card>

        <div className="space-y-6">

          <div>

            <h2 className="text-3xl font-bold">
              Review Estimate
            </h2>

            <p className="mt-2 text-slate-500">
              Review everything before sending this estimate.
            </p>

          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <div>

              <h3 className="font-semibold text-lg">
                Customer
              </h3>

              <div className="mt-2 space-y-1 text-slate-600">

                <div>
                  {estimate.customer.firstName}{" "}
                  {estimate.customer.lastName}
                </div>

                <div>
                  {estimate.customer.phone}
                </div>

                <div>
                  {estimate.customer.email}
                </div>

              </div>

            </div>

            <div>

              <h3 className="font-semibold text-lg">
                Property
              </h3>

              <div className="mt-2 space-y-1 text-slate-600">

                <div>
                  {estimate.property.address}
                </div>

                <div>
                  {estimate.property.city},{" "}
                  {estimate.property.state}
                </div>

                <div>
                  {estimate.property.zip}
                </div>

              </div>

            </div>

          </div>

        </div>

      </Card>

      <EstimateBreakdown />
      <SmartPricingPanel />

      <EstimateSummary />

    </div>
  );
}
