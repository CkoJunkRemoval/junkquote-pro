"use client";

import { useEffect, useState } from "react";
import { listActivePricingProfilesAction } from "@/app/actions/pricingProfiles/pricingProfiles";
import { useEstimate } from "../EstimateContext";

type Profile = Awaited<ReturnType<typeof listActivePricingProfilesAction>>[number];

export default function PricingProfileSelect() {
  const { estimate, estimateId, changePricingProfile } = useEstimate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void listActivePricingProfilesAction()
      .then(setProfiles)
      .catch(() => setError("Pricing profiles could not be loaded."));
  }, []);

  async function select(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile || profile.id === estimate.pricingProfileId) return;
    const hasManualPricing = estimate.pricingManuallyEdited || estimate.jobSites.some((site) => site.items.some((item) => item.pricingManuallyEdited));
    if (
      hasManualPricing &&
      !window.confirm("Changing profiles will replace manually edited pricing values. Continue?")
    ) return;
    setPending(true);
    setError("");
    try {
      await changePricingProfile(profile, hasManualPricing);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pricing profile could not be changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="estimate-pricing-profile" className="block text-sm font-semibold text-slate-700">
        Pricing profile
      </label>
      <select
        id="estimate-pricing-profile"
        value={estimate.pricingProfileId}
        onChange={(event) => void select(event.target.value)}
        disabled={!estimateId || pending}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!estimate.pricingProfileId && <option value="">Loading default profile…</option>}
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}{profile.defaultProfile ? " (Default)" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        Profile defaults are loaded automatically. Changing profiles recalculates this estimate.
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
