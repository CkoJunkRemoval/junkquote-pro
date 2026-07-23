"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GlobalSearch from "./GlobalSearch";

export const NEW_ESTIMATE_HREF = "/estimates?new=1";

export function isNewEstimateShortcut(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey" | "target">,
) {
  const target = event.target;
  if (
    typeof HTMLElement !== "undefined" &&
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  ) {
    return false;
  }

  const key = event.key.toLowerCase();
  return (
    (key === "n" &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey) ||
    (key === "n" &&
      event.ctrlKey &&
      event.shiftKey &&
      !event.altKey &&
      !event.metaKey)
  );
}

export function routeToNewEstimate(
  push: (href: string) => void,
  setRouting: (routing: boolean) => void,
) {
  setRouting(true);
  push(NEW_ESTIMATE_HREF);
}

export default function DashboardQuickActions({
  canCreateEstimate,
}: {
  canCreateEstimate: boolean;
}) {
  const router = useRouter();
  const [routing, setRouting] = useState(false);

  function openNewEstimate() {
    if (routing || !canCreateEstimate) return;
    routeToNewEstimate(router.push, setRouting);
  }

  useEffect(() => {
    if (!canCreateEstimate) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!isNewEstimateShortcut(event)) return;
      event.preventDefault();
      openNewEstimate();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div
      data-testid="dashboard-header"
      className="grid w-full gap-3 py-3 md:grid-cols-[auto_minmax(16rem,32rem)_auto] md:items-center md:py-0"
    >
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
        Dashboard
      </h1>
      <GlobalSearch dashboard />
      {canCreateEstimate && (
        <button
          type="button"
          aria-label="Create new estimate"
          aria-keyshortcuts="N Control+Shift+N"
          disabled={routing}
          onClick={openNewEstimate}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 md:w-auto"
        >
          <Plus aria-hidden="true" size={18} />
          {routing ? "Opening…" : "New Estimate"}
        </button>
      )}
    </div>
  );
}
