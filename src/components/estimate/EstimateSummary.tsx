"use client";

import Card from "@/components/ui/Card";
import { useEstimate } from "@/features/estimate/EstimateContext";
import { DEFAULT_PRICING } from "@/data/pricing";

export default function EstimateSummary() {
  const { estimate } = useEstimate();

  return (
    <Card className="sticky top-6">

      <h2 className="text-2xl font-bold mb-6">
        Estimate Summary
      </h2>

      <div className="space-y-6">

        <div>
          <p className="text-sm text-slate-500">
            Customer
          </p>

          <p className="font-semibold">
            {estimate.customerType ?? "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">
            Property
          </p>

          <p className="capitalize font-semibold">
            {estimate.property.type || "-"}
          </p>

          <p className="text-sm text-slate-500 mt-1">
            {estimate.property.address || ""}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">
            Job Sites
          </p>

          {estimate.jobSites.length === 0 ? (
            <p>-</p>
          ) : (
            <ul className="space-y-1 mt-2">

              {estimate.jobSites.map(site => (
                <li key={site.id}>
                  • {site.name}
                </li>
              ))}

            </ul>
          )}

        </div>

        <hr />

        <div>

          <p className="text-sm text-slate-500">
            Minimum Charge
          </p>

          <p className="text-3xl font-bold">
            ${DEFAULT_PRICING.minimumCharge}
          </p>

        </div>

      </div>

    </Card>
  );
}