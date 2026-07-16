"use client";

import { useEffect, useRef } from "react";
import { getJobSiteItemsAction } from "@/app/actions/estimateItems/getJobSiteItems";
import { calculateJobSiteSubtotal } from "@/data/pricing/calculateEstimate";

import { useEstimate } from "../EstimateContext";
import { toEstimateItem } from "../estimateItemMapper";
import Walkthrough from "../walkthrough/Walkthrough";

export default function ItemsStep() {
  const { estimate, setJobSites } = useEstimate();
  const jobSitesRef = useRef(estimate.jobSites);
  const jobSiteIds = estimate.jobSites
    .map((jobSite) => jobSite.id)
    .join(",");

  useEffect(() => {
    jobSitesRef.current = estimate.jobSites;
  }, [estimate.jobSites]);

  useEffect(() => {
    if (!jobSiteIds) {
      return;
    }

    let isCurrent = true;

    Promise.all(
      jobSitesRef.current.map(async (jobSite) => ({
        id: jobSite.id,
        items: await getJobSiteItemsAction(jobSite.id),
      }))
    )
      .then((itemsByJobSite) => {
        if (!isCurrent) {
          return;
        }

        const itemsByJobSiteId = new Map(
          itemsByJobSite.map(({ id, items }) => [
            id,
            items.map(toEstimateItem),
          ])
        );

        setJobSites(
          jobSitesRef.current.map((jobSite) => {
            const items = itemsByJobSiteId.get(jobSite.id) ?? [];

            return {
              ...jobSite,
              items,
              subtotal: calculateJobSiteSubtotal({
                ...jobSite,
                items,
              }),
            };
          })
        );
      })
      .catch((error) => {
        console.error("Estimate item loading failed:", error);
      });

    return () => {
      isCurrent = false;
    };
  }, [jobSiteIds, setJobSites]);

  return <Walkthrough />;
}
