import { Estimate, EstimateItem, JobSite } from "../types";

export function addItemToJobSite(
  estimate: Estimate,
  jobSiteId: string,
  item: EstimateItem
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.map((jobSite) => {
      if (jobSite.id !== jobSiteId) {
        return jobSite;
      }

      const existing = jobSite.items.find(
        (i) => i.itemId === item.itemId
      );

      if (existing) {
        return {
          ...jobSite,
          items: jobSite.items.map((i) =>
            i.itemId === item.itemId
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                }
              : i
          ),
        };
      }

      return {
        ...jobSite,
        status: "in-progress",
        items: [...jobSite.items, item],
      };
    }),
  };
}

export function removeItemFromJobSite(
  estimate: Estimate,
  jobSiteId: string,
  itemId: string
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.map((jobSite) => {
      if (jobSite.id !== jobSiteId) {
        return jobSite;
      }

      return {
        ...jobSite,
        items: jobSite.items.filter(
          (item) => item.itemId !== itemId
        ),
      };
    }),
  };
}

export function updateJobSite(
  estimate: Estimate,
  updatedJobSite: JobSite
): Estimate {
  return {
    ...estimate,
    jobSites: estimate.jobSites.map((jobSite) =>
      jobSite.id === updatedJobSite.id
        ? updatedJobSite
        : jobSite
    ),
  };
}