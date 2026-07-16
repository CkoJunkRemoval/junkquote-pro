"use client";

import { useEffect, useRef, useState } from "react";
import type { JobSite as PersistedJobSite } from "@/generated/prisma/client";

import { createJobSiteAction } from "@/app/actions/jobSites/createJobSite";
import { deleteJobSiteAction } from "@/app/actions/jobSites/deleteJobSite";
import { getJobSitesAction } from "@/app/actions/jobSites/getJobSites";
import { updateJobSiteAction } from "@/app/actions/jobSites/updateJobSite";

import { useEstimate } from "../EstimateContext";
import type { JobSite, JobSiteStatus } from "../types";

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

function toJobSite(jobSite: PersistedJobSite): JobSite {
  return {
    id: jobSite.id,
    name: jobSite.name,
    status: jobSite.status as JobSiteStatus,
    customerNotes: jobSite.customerNotes,
    crewNotes: jobSite.crewNotes,
    internalNotes: jobSite.internalNotes,
    photos: [],
    items: [],
    subtotal: 0,
  };
}

export default function JobSiteScreen() {
  const { estimate, estimateId, setJobSites } = useEstimate();
  const [loadingJobSites, setLoadingJobSites] = useState(false);
  const [savingJobSiteId, setSavingJobSiteId] = useState<string | null>(null);
  const [savedJobSiteId, setSavedJobSiteId] = useState<string | null>(null);
  const jobSiteNameInputRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});
  const newJobSiteIdRef = useRef<string | null>(null);
  const savedMessageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!estimateId) {
      return;
    }

    let isCurrent = true;

    Promise.resolve()
      .then(() => {
        if (!isCurrent) {
          return [];
        }

        setLoadingJobSites(true);
        return getJobSitesAction(estimateId);
      })
      .then((jobSites) => {
        if (isCurrent) {
          setJobSites(jobSites.map(toJobSite));
        }
      })
      .catch((error) => {
        console.error("Job Site loading failed:", error);
      })
      .finally(() => {
        if (isCurrent) {
          setLoadingJobSites(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [estimateId, setJobSites]);

  useEffect(() => {
    const jobSiteId = newJobSiteIdRef.current;

    if (jobSiteId) {
      jobSiteNameInputRefs.current[jobSiteId]?.focus();
      newJobSiteIdRef.current = null;
    }
  }, [estimate.jobSites]);

  useEffect(() => {
    return () => {
      if (savedMessageTimerRef.current) {
        window.clearTimeout(savedMessageTimerRef.current);
      }
    };
  }, []);

  function showSaved(jobSiteId: string) {
    if (savedMessageTimerRef.current) {
      window.clearTimeout(savedMessageTimerRef.current);
    }

    setSavedJobSiteId(jobSiteId);
    savedMessageTimerRef.current = window.setTimeout(() => {
      setSavedJobSiteId(null);
    }, 2000);
  }

  async function removeJobSite(jobSite: JobSite) {
    if (
      savingJobSiteId ||
      !window.confirm(`Delete ${jobSite.name}?`)
    ) {
      return;
    }

    setSavingJobSiteId(jobSite.id);

    try {
      await deleteJobSiteAction(jobSite.id);
      setJobSites(
        estimate.jobSites.filter(
          (currentJobSite) => currentJobSite.id !== jobSite.id
        )
      );
    } catch (error) {
      console.error("Job Site deletion failed:", error);
    } finally {
      setSavingJobSiteId(null);
    }
  }

  async function toggleArea(area: string) {
    if (!estimateId || savingJobSiteId) {
      return;
    }

    const existingJobSite = estimate.jobSites.find(
      (jobSite) => jobSite.name === area
    );

    if (existingJobSite) {
      await removeJobSite(existingJobSite);
      return;
    }

    setSavingJobSiteId("create");

    try {
      const createdJobSite = await createJobSiteAction({
        estimateId,
        name: area,
        sortOrder: estimate.jobSites.length,
      });

      newJobSiteIdRef.current = createdJobSite.id;
      setJobSites([
        ...estimate.jobSites,
        toJobSite(createdJobSite),
      ]);
    } catch (error) {
      console.error("Job Site creation failed:", error);
    } finally {
      setSavingJobSiteId(null);
    }
  }

  async function persistJobSite(
    jobSite: JobSite,
    changes: Partial<Pick<
      JobSite,
      "name" | "status" | "customerNotes" | "crewNotes" | "internalNotes"
    >>
  ) {
    if (savingJobSiteId) {
      return;
    }

    setSavingJobSiteId(jobSite.id);

    try {
      const updatedJobSite = await updateJobSiteAction({
        id: jobSite.id,
        ...changes,
      });

      setJobSites(
        estimate.jobSites.map((currentJobSite) =>
          currentJobSite.id === jobSite.id
            ? toJobSite(updatedJobSite)
            : currentJobSite
        )
      );
      showSaved(jobSite.id);
    } catch (error) {
      console.error("Job Site update failed:", error);
    } finally {
      setSavingJobSiteId(null);
    }
  }

  if (!estimateId) {
    return (
      <div>
        <h2 className="text-3xl font-bold">
          Which areas contain junk?
        </h2>

        <p className="mt-2 text-slate-500">
          Saving your estimate before job sites can be added...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">
          Which areas contain junk?
        </h2>

        <p className="mt-2 text-slate-500">
          Select every area you&apos;ll be working in.
        </p>
      </div>

      {loadingJobSites && (
        <p className="text-slate-500">
          Loading job sites...
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {AREAS.map((area) => {
          const selected = estimate.jobSites.some(
            (jobSite) => jobSite.name === area
          );

          return (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              disabled={Boolean(savingJobSiteId)}
              className={`rounded-2xl border p-6 text-left transition disabled:cursor-not-allowed ${
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

      {estimate.jobSites.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">
            Job Site Details
          </h3>

          {estimate.jobSites.map((jobSite) => {
            const isSaving = savingJobSiteId === jobSite.id;

            return (
              <div
                key={jobSite.id}
                className="space-y-4 rounded-2xl border border-slate-300 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <input
                    ref={(element) => {
                      jobSiteNameInputRefs.current[jobSite.id] = element;
                    }}
                    type="text"
                    value={jobSite.name}
                    onChange={(event) =>
                      setJobSites(
                        estimate.jobSites.map((currentJobSite) =>
                          currentJobSite.id === jobSite.id
                            ? {
                                ...currentJobSite,
                                name: event.target.value,
                              }
                            : currentJobSite
                        )
                      )
                    }
                    onBlur={(event) =>
                      void persistJobSite(jobSite, {
                        name: event.target.value,
                      })
                    }
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-300 p-3 font-semibold disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() => void removeJobSite(jobSite)}
                    disabled={isSaving}
                    className="rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>

                  {savedJobSiteId === jobSite.id && (
                    <p className="text-sm font-medium text-green-600">
                      Saved
                    </p>
                  )}
                </div>

                <select
                  value={jobSite.status}
                  onChange={(event) =>
                    void persistJobSite(jobSite, {
                      status: event.target.value as JobSiteStatus,
                    })
                  }
                  disabled={isSaving}
                  className="w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                >
                  <option value="not-started">Not started</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>

                <textarea
                  placeholder="Customer Notes"
                  defaultValue={jobSite.customerNotes}
                  onBlur={(event) =>
                    void persistJobSite(jobSite, {
                      customerNotes: event.target.value,
                    })
                  }
                  disabled={isSaving}
                  className="min-h-24 w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />

                <textarea
                  placeholder="Crew Notes"
                  defaultValue={jobSite.crewNotes}
                  onBlur={(event) =>
                    void persistJobSite(jobSite, {
                      crewNotes: event.target.value,
                    })
                  }
                  disabled={isSaving}
                  className="min-h-24 w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />

                <textarea
                  placeholder="Internal Notes"
                  defaultValue={jobSite.internalNotes}
                  onBlur={(event) =>
                    void persistJobSite(jobSite, {
                      internalNotes: event.target.value,
                    })
                  }
                  disabled={isSaving}
                  className="min-h-24 w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
