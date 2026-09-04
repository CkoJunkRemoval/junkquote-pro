"use client";

import { useEffect, useState } from "react";
import { updateActiveLocationAction } from "@/app/actions/timekeeping/timekeeping";

export const ACTIVE_LOCATION_INTERVAL_MS = 5 * 60 * 1000;

export default function ActiveShiftLocation({ active }: { active: boolean }) {
  const [status, setStatus] = useState(
    active
      ? "Requesting location permission…"
      : "Location tracking is off while clocked out.",
  );
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const report = () =>
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (stopped) return;
          void updateActiveLocationAction({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
            .then(() => setStatus("Location shared with dispatch."))
            .catch(() => setStatus("Location could not be updated."));
        },
        () =>
          setStatus(
            "Location unavailable. Check this device's location permission.",
          ),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
      );
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setStatus("Location is unavailable on this device."));
      return;
    }
    report();
    const timer = setInterval(report, ACTIVE_LOCATION_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [active]);
  return (
    <div className="mt-5 rounded-xl border border-slate-600 p-4 text-sm">
      <p className="font-semibold">Active-shift location</p>
      <p className="mt-1 text-slate-300">
        JunkQuote Pro uses your location while you&apos;re clocked in so
        dispatch can see where active crews are.
      </p>
      <p className="mt-2" role="status">
        {status}
      </p>
    </div>
  );
}
