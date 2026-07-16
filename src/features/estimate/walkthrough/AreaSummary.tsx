"use client";

import { ITEM_LIBRARY } from "@/data/items";

import { JobSite } from "../types";

interface AreaSummaryProps {
  jobSite: JobSite;
}

export default function AreaSummary({
  jobSite,
}: AreaSummaryProps) {
  const totalItems = jobSite.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  let totalVolume = 0;
  let heavyItems = 0;

  jobSite.items.forEach((estimateItem) => {
    const libraryItem = ITEM_LIBRARY.find(
      (item) => item.id === estimateItem.itemId
    );

    if (!libraryItem) return;

    totalVolume +=
      libraryItem.volume *
      estimateItem.quantity;

    if (
      libraryItem.weightClass === "Heavy" ||
      libraryItem.weightClass === "Extra Heavy"
    ) {
      heavyItems += estimateItem.quantity;
    }
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">
        Area Summary
      </h2>

      <p className="mt-1 text-slate-500">
        {jobSite.name}
      </p>

      <div className="mt-8 space-y-4">

        <div className="flex justify-between">
          <span>Items</span>

          <strong>{totalItems}</strong>
        </div>

        <div className="flex justify-between">
          <span>Heavy Items</span>

          <strong>{heavyItems}</strong>
        </div>

        <div className="flex justify-between">
          <span>Truck Volume</span>

          <strong>{totalVolume}</strong>
        </div>

        <div className="flex justify-between">
          <span>Status</span>

          <strong className="capitalize">
            {jobSite.status.replace("-", " ")}
          </strong>
        </div>

        <hr />

        <div className="flex justify-between text-xl font-bold">
          <span>Subtotal</span>

          <span>
            ${jobSite.subtotal.toFixed(2)}
          </span>
        </div>

      </div>
    </div>
  );
}
