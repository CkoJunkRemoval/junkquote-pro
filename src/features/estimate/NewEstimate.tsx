"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StepHeader from "@/components/estimate/StepHeader";
import EstimateSummary from "@/components/estimate/EstimateSummary";

import {
  EstimateProvider,
  useEstimate,
} from "./EstimateContext";

import CustomerStep from "./steps/CustomerScreen";
import PropertyStep from "./steps/PropertyScreen";
import JobSiteStep from "./steps/JobSiteScreen";
import ItemsStep from "./steps/ItemsScreen";

import ReviewEstimate from "./review/ReviewEstimate";
import EstimateReady from "./ready/EstimateReady";
import { deleteEstimateAction } from "@/app/actions/estimates/deleteEstimate";
import { listDraftEstimatesAction } from "@/app/actions/estimates/listDraftEstimates";
import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

type DraftEstimate = Awaited<ReturnType<typeof listDraftEstimatesAction>>[number];

function getSavedEstimateId() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    new URLSearchParams(window.location.search).get("estimateId") ||
    window.localStorage.getItem("junkquote:estimateId")
  );
}

function clearSavedEstimateId() {
  window.localStorage.removeItem("junkquote:estimateId");
  const url = new URL(window.location.href);
  url.searchParams.delete("estimateId");
  window.history.replaceState({}, "", url);
}

function ResumeDraftEstimates({
  onStartNew,
  onResume,
}: {
  onStartNew: () => void;
  onResume: (estimateId: string) => void;
}) {
  const [drafts, setDrafts] = useState<DraftEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingEstimateId, setDeletingEstimateId] = useState<string | null>(null);

  useEffect(() => {
    void listDraftEstimatesAction(DEVELOPMENT_COMPANY_ID)
      .then(setDrafts)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load drafts.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function deleteDraft(estimateId: string) {
    if (!window.confirm("Delete this draft estimate? This cannot be undone.")) {
      return;
    }

    setDeletingEstimateId(estimateId);
    setError(null);

    try {
      await deleteEstimateAction(estimateId);
      setDrafts((currentDrafts) =>
        currentDrafts.filter((draft) => draft.id !== estimateId)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the draft estimate."
      );
    } finally {
      setDeletingEstimateId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
            <p className="mt-1 text-slate-600">Start a new estimate or continue a saved draft.</p>
          </div>
          <Button onClick={onStartNew}>New Estimate</Button>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Resume Draft</h2>

          {isLoading && <p className="mt-4 text-slate-600">Loading drafts…</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
          {!isLoading && !error && drafts.length === 0 && (
            <p className="mt-4 text-slate-600">No draft estimates found.</p>
          )}

          <div className="mt-4 space-y-3">
            {drafts.map((draft) => {
              const isDeleting = deletingEstimateId === draft.id;

              return (
              <div
                key={draft.id}
                className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {draft.customer.firstName} {draft.customer.lastName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {draft.property.address}, {draft.property.city}, {draft.property.state} {draft.property.zip}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Updated {new Date(draft.updatedAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">Estimate ID: {draft.id}</p>
                <div className="mt-4 flex gap-3">
                  <Button
                    type="button"
                    onClick={() => onResume(draft.id)}
                    disabled={isDeleting}
                  >
                    Open
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void deleteDraft(draft.id)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

function EstimateWizard({
  isResuming,
  onDeleteDraft,
}: {
  isResuming: boolean;
  onDeleteDraft: (estimateId: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    estimate,
    estimateId,
    isLoadingEstimate,
    resetEstimate,
    wizardStep,
    setWizardStep,
  } = useEstimate();
  const customerName = [
    estimate.customer.firstName,
    estimate.customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  async function deleteCurrentDraft() {
    if (!estimateId || !window.confirm("Delete this draft estimate? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await onDeleteDraft(estimateId);
      resetEstimate();
      setWizardStep(1);
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the draft estimate."
      );
      setIsDeleting(false);
    }
  }

  function nextStep() {
    switch (wizardStep) {
      case 1:
        if (!estimate.customerType) return;
        if (!estimate.customer.firstName.trim()) return;
        if (!estimate.customer.lastName.trim()) return;
        if (!estimate.customer.phone.trim()) return;
        break;

      case 2:
        if (!estimate.property.type) return;
        if (!estimate.property.address.trim()) return;
        break;

      case 3:
        if (estimate.jobSites.length === 0) return;
        break;
    }

    if (wizardStep < 6) {
      setWizardStep(wizardStep + 1);
    }
  }

  function previousStep() {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  }

  function renderStep() {
    switch (wizardStep) {
      case 1:
        return <CustomerStep />;

      case 2:
        return <PropertyStep />;

      case 3:
        return <JobSiteStep />;

      case 4:
        return <ItemsStep />;

      case 5:
        return <ReviewEstimate />;

      case 6:
        return <EstimateReady />;

      default:
        return null;
    }
  }

  const showSidebar = wizardStep <= 4;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">

      <StepHeader
        step={wizardStep}
        totalSteps={6}
        title="New Estimate"
        description="Create a professional estimate."
        estimateId={estimateId}
        customerName={customerName}
      />

      {isResuming && estimateId && (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            onClick={() => void deleteCurrentDraft()}
            disabled={isDeleting || isLoadingEstimate}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Draft"}
          </Button>
        </div>
      )}

      {deleteError && <p className="mb-4 text-red-600">{deleteError}</p>}

      <div
        className={`grid gap-8 ${
          showSidebar
            ? "grid-cols-1 xl:grid-cols-3"
            : "grid-cols-1"
        }`}
      >

        <div
          className={
            showSidebar
              ? "xl:col-span-2"
              : "w-full"
          }
        >

          <Card>

            {isLoadingEstimate ? (
              <p className="py-12 text-center text-slate-600">Loading saved estimate…</p>
            ) : (
              renderStep()
            )}

            <div className="mt-10 flex justify-between">

              <Button
                onClick={previousStep}
                disabled={wizardStep === 1 || isLoadingEstimate}
              >
                Back
              </Button>

              {wizardStep < 6 && (
                <Button onClick={nextStep} disabled={isLoadingEstimate}>
                  Continue
                </Button>
              )}

            </div>

          </Card>

        </div>

        {showSidebar && (
          <EstimateSummary />
        )}

      </div>

    </div>
  );
}

export default function NewEstimate() {
  const savedEstimateId = useSyncExternalStore(
    () => () => undefined,
    getSavedEstimateId,
    () => null
  );
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const resumeEstimateId = selectedEstimateId ?? savedEstimateId;

  async function deleteCurrentDraft(estimateId: string) {
    await deleteEstimateAction(estimateId);
    clearSavedEstimateId();
    setSelectedEstimateId("new");
  }

  if (!resumeEstimateId) {
    return (
      <ResumeDraftEstimates
        onStartNew={() => {
          clearSavedEstimateId();
          setSelectedEstimateId("new");
        }}
        onResume={setSelectedEstimateId}
      />
    );
  }

  return (
    <EstimateProvider
      initialEstimateId={resumeEstimateId === "new" ? null : resumeEstimateId}
    >
      <EstimateWizard
        isResuming={resumeEstimateId !== "new"}
        onDeleteDraft={deleteCurrentDraft}
      />
    </EstimateProvider>
  );
}
