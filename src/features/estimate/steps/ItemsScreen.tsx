"use client";

import { ITEM_LIBRARY } from "@/data/items";
import { useEstimate } from "../EstimateContext";
import Card from "@/components/ui/Card";

export default function ItemsStep() {
  const { estimate } = useEstimate();

  const selectedAreas = estimate.jobSites;

  return (
    <div className="space-y-8">

      <div>

        <h2 className="text-3xl font-bold">
          Add Items
        </h2>

        <p className="text-slate-500 mt-2">
          Select a job site to begin adding items.
        </p>

      </div>

      {selectedAreas.length === 0 && (

        <Card>

          <p>No job sites selected.</p>

        </Card>

      )}

      {selectedAreas.map(site => {

        const items = ITEM_LIBRARY.filter(item =>
          item.commonAreas.includes(site.name)
        );

        return (

          <Card key={site.id}>

            <h3 className="text-2xl font-bold mb-6">
              {site.name}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {items.map(item => (

                <button
                  key={item.id}
                  className="rounded-xl border border-slate-300 p-4 text-left hover:border-blue-500 transition"
                >
                  <p className="font-semibold">
                    {item.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {item.category}
                  </p>

                </button>

              ))}

            </div>

          </Card>

        );

      })}

    </div>
  );
}