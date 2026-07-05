import { Estimate, JobSite } from "@/features/estimate/types";

export function addJobSite(
  estimate: Estimate,
  jobSite: JobSite
): Estimate {
  return {
    ...estimate,
    jobSites: [...estimate.jobSites, jobSite],
  };
}

export function removeJobSite(
  estimate: Estimate,
  jobSiteId: string
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.filter(
      (site) => site.id !== jobSiteId
    ),
  };
}

export function completeJobSite(
  estimate: Estimate,
  jobSiteId: string
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.map((site) =>
      site.id === jobSiteId
        ? {
            ...site,
            completed: true,
          }
        : site
    ),
  };
}

export function reopenJobSite(
  estimate: Estimate,
  jobSiteId: string
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.map((site) =>
      site.id === jobSiteId
        ? {
            ...site,
            completed: false,
          }
        : site
    ),
  };
}