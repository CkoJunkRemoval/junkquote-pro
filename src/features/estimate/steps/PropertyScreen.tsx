"use client";

import { useEstimate } from "../EstimateContext";

export default function PropertyStep() {
  const { estimate, setEstimate } = useEstimate();

  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-3xl font-bold">
          Where are we working today?
        </h2>

        <p className="text-slate-500 mt-2">
          Choose the property type.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {[
          ["house", "🏠", "House"],
          ["apartment", "🏢", "Apartment"],
          ["commercial", "🏬", "Commercial"],
          ["storage", "📦", "Storage Unit"],
        ].map(([value, emoji, label]) => (

          <button
            key={value}
            onClick={() =>
              setEstimate({
                ...estimate,
                property: {
                  ...estimate.property,
                  type: value as any,
                },
              })
            }
            className={`rounded-2xl border p-6 text-left transition ${
              estimate.property.type === value
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 hover:border-blue-500"
            }`}
          >
            <div className="text-4xl mb-3">
              {emoji}
            </div>

            <h3 className="text-xl font-bold">
              {label}
            </h3>

          </button>

        ))}

      </div>

      {estimate.property.type && (

        <div className="space-y-4">

          <input
            placeholder="Street Address"
            value={estimate.property.address}
            onChange={(e) =>
              setEstimate({
                ...estimate,
                property: {
                  ...estimate.property,
                  address: e.target.value,
                },
              })
            }
            className="w-full rounded-xl border border-slate-300 p-4"
          />

          <div className="grid grid-cols-3 gap-4">

            <input
              placeholder="City"
              value={estimate.property.city}
              onChange={(e) =>
                setEstimate({
                  ...estimate,
                  property: {
                    ...estimate.property,
                    city: e.target.value,
                  },
                })
              }
              className="rounded-xl border border-slate-300 p-4"
            />

            <input
              placeholder="State"
              value={estimate.property.state}
              onChange={(e) =>
                setEstimate({
                  ...estimate,
                  property: {
                    ...estimate.property,
                    state: e.target.value,
                  },
                })
              }
              className="rounded-xl border border-slate-300 p-4"
            />

            <input
              placeholder="ZIP"
              value={estimate.property.zip}
              onChange={(e) =>
                setEstimate({
                  ...estimate,
                  property: {
                    ...estimate.property,
                    zip: e.target.value,
                  },
                })
              }
              className="rounded-xl border border-slate-300 p-4"
            />

          </div>

        </div>

      )}

    </div>
  );
}