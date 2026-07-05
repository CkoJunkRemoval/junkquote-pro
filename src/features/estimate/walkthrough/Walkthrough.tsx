"use client";

import { useMemo, useState } from "react";

import { useEstimate } from "../EstimateContext";

import WalkthroughHeader from "./WalkthroughHeader";
import AreaNavigator from "./AreaNavigator";
import ItemGrid from "./ItemGrid";
import PhotoPanel from "./PhotoPanel";
import NotesPanel from "./NotesPanel";
import AreaSummary from "./AreaSummary";

export default function Walkthrough() {
  const { estimate } = useEstimate();

  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);

  const areas = estimate.jobSites;

  const currentArea = useMemo(() => {
    return areas[currentAreaIndex];
  }, [areas, currentAreaIndex]);

  function previousArea() {
    if (currentAreaIndex > 0) {
      setCurrentAreaIndex((i) => i - 1);
    }
  }

  function nextArea() {
    if (currentAreaIndex < areas.length - 1) {
      setCurrentAreaIndex((i) => i + 1);
    }
  }

  if (areas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <h2 className="text-3xl font-bold">
          No Areas Selected
        </h2>

        <p className="mt-3 text-slate-500">
          Go back and select at least one area before starting the walkthrough.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      <WalkthroughHeader
        current={currentAreaIndex + 1}
        total={areas.length}
        area={currentArea}
      />

      <div className="grid gap-6 xl:grid-cols-3">

        <div className="space-y-6 xl:col-span-2">

          <PhotoPanel />

          <ItemGrid
            jobSite={currentArea}
          />

          <NotesPanel />

        </div>

        <div>

          <AreaSummary
            jobSite={currentArea}
          />

        </div>

      </div>

      <AreaNavigator
        current={currentAreaIndex}
        total={areas.length}
        onPrevious={previousArea}
        onNext={nextArea}
      />

    </div>
  );
}