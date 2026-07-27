"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FleetAssetStatus } from "@/generated/prisma/client";
import {
  changeAssetLifecycleAction,
  deleteUnusedAssetAction,
} from "@/app/actions/fleet/fleet";

const terminal = new Set<FleetAssetStatus>([
  "Retired",
  "Sold",
  "Lost",
  "Stolen",
]);

export default function AssetLifecycleControls({
  assetId,
  assetName,
  status,
  canDelete,
  blockers,
}: {
  assetId: string;
  assetName: string;
  status: FleetAssetStatus;
  canDelete: boolean;
  blockers: { label: string; count: number }[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: "Retired" | "Sold" | "Lost" | "Stolen" | "Available") {
    setError(null);
    setMessage(null);
    if (!reason.trim()) {
      setError("Enter a reason before changing the asset lifecycle.");
      return;
    }
    const label = next === "Available" ? "reactivate" : `mark ${next.toLowerCase()}`;
    if (!window.confirm(`Confirm that you want to ${label} ${assetName}. Historical records will be preserved.`))
      return;
    startTransition(async () => {
      try {
        await changeAssetLifecycleAction(assetId, next, reason);
        setMessage(
          next === "Available"
            ? "Asset reactivated."
            : `Asset marked ${next.toLowerCase()}.`,
        );
        setReason("");
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to update asset.",
        );
      }
    });
  }

  function remove() {
    setError(null);
    setMessage(null);
    if (confirmation !== assetName) {
      setError(`Type "${assetName}" to confirm permanent deletion.`);
      return;
    }
    if (!window.confirm(`Permanently delete ${assetName}? This cannot be undone.`))
      return;
    startTransition(async () => {
      try {
        await deleteUnusedAssetAction(assetId, confirmation);
        router.push("/fleet/assets");
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to remove asset.",
        );
      }
    });
  }

  return (
    <section className="glass-card mt-6 p-5" aria-labelledby="asset-lifecycle-title">
      <h2 id="asset-lifecycle-title" className="text-xl font-bold">
        Asset lifecycle
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Lifecycle actions preserve mileage, jobs, maintenance, documents, finance
        links, and the asset timeline.
      </p>
      <label className="mt-4 grid gap-2 text-sm font-semibold">
        Reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-24 rounded-xl border p-3"
          placeholder="Required for retirement, loss, sale, theft, or reactivation"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {terminal.has(status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => change("Available")}
            className="ui-button ui-button--primary min-h-11 rounded-xl px-4 font-semibold"
          >
            Reactivate
          </button>
        ) : (
          <>
            <LifecycleButton pending={pending} onClick={() => change("Retired")}>Retire</LifecycleButton>
            <LifecycleButton pending={pending} onClick={() => change("Sold")}>Mark Sold</LifecycleButton>
            <LifecycleButton pending={pending} onClick={() => change("Lost")}>Mark Lost</LifecycleButton>
            <LifecycleButton pending={pending} onClick={() => change("Stolen")}>Mark Stolen</LifecycleButton>
          </>
        )}
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="font-bold text-red-300">Remove Asset</h3>
        {canDelete ? (
          <>
            <p className="mt-2 text-sm text-slate-300">
              This unused asset has no operational history. Permanent deletion
              cannot be undone.
            </p>
            <label className="mt-3 grid gap-2 text-sm font-semibold">
              Type {assetName} to confirm
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="min-h-11 rounded-xl border px-3"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="mt-3 min-h-11 rounded-xl border border-red-400 px-4 font-semibold text-red-200"
            >
              Remove Asset
            </button>
          </>
        ) : (
          <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-950/30 p-4 text-sm">
            <p>Permanent deletion is unavailable because history exists:</p>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((blocker) => (
                <li key={blocker.label}>
                  {blocker.count} {blocker.label}
                </li>
              ))}
            </ul>
            <p className="mt-2">Use a lifecycle status above instead.</p>
          </div>
        )}
      </div>
      {message && <p role="status" className="mt-4 text-green-300">{message}</p>}
      {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
    </section>
  );
}

function LifecycleButton({
  children,
  pending,
  onClick,
}: {
  children: React.ReactNode;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="ui-button ui-button--secondary min-h-11 rounded-xl px-4 font-semibold"
    >
      {children}
    </button>
  );
}
