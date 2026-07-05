"use client";

import { useEstimate } from "../EstimateContext";

const AREAS = [
  "Garage",
  "Basement",
  "Attic",
  "Kitchen",
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Office",
  "Backyard",
  "Shed",
  "Driveway",
];

export default function JobSiteScreen() {
  const { estimate, setEstimate } = useEstimate();

  function toggleArea(area: string) {
    const exists = estimate.jobSites.find(
      (site) => site.name === area
    );

    if (exists) {
      setEstimate({
        ...estimate,
        jobSites: estimate.jobSites.filter(
          (site) => site.name !== area
        ),
      });

      return;
    }

    setEstimate({
      ...estimate,
      jobSites: [
        ...estimate.jobSites,
        {
          id: crypto.randomUUID(),

          name: area,

          status: "not-started",

          customerNotes: "",

          crewNotes: "",

          internalNotes: "",

          photos: [],

          items: [],

          subtotal: 0,
        },
      ],
    });
  }

  return (
    <div>

      <h2 className="text-3xl font-bold">
        Which areas contain junk?
      </h2>

      <p className="mt-2 mb-8 text-slate-500">
        Select every area you'll be working in.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

        {AREAS.map((area) => {

          const selected = estimate.jobSites.some(
            (site) => site.name === area
          );

          return (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={`rounded-2xl border p-6 text-left transition ${
                selected
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-300 hover:border-blue-500"
              }`}
            >
              <h3 className="text-lg font-semibold">
                {area}
              </h3>

              {selected && (
                <p className="mt-2 text-sm text-blue-700">
                  Selected
                </p>
              )}
            </button>
          );
        })}

      </div>

    </div>
  );
}