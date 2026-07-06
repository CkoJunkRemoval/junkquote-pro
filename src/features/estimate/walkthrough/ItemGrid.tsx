"use client";

import { useMemo, useState } from "react";

import ItemCard from "@/components/estimate/ItemCard";
import { ITEM_LIBRARY } from "@/data/items";

import { JobSite } from "../types";
import { useEstimate } from "../EstimateContext";

interface ItemGridProps {
  jobSite: JobSite;
}

export default function ItemGrid({
  jobSite,
}: ItemGridProps) {
  const { estimate, setEstimate } = useEstimate();

  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    return ITEM_LIBRARY.filter((item) => {
      const matchesArea = item.commonAreas.includes(
        jobSite.name
      );

      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesArea && matchesSearch;
    });
  }, [jobSite.name, search]);

  function getEstimateItem(itemId: string) {
    return jobSite.items.find(
      (item) => item.itemId === itemId
    );
  }

  function isSelected(itemId: string) {
    return !!getEstimateItem(itemId);
  }

  function updateItemQuantity(
    itemId: string,
    change: number
  ) {
    const updatedJobSites = estimate.jobSites.map(
      (site) => {
        if (site.id !== jobSite.id) {
          return site;
        }

        const existing = site.items.find(
          (item) => item.itemId === itemId
        );

        if (!existing) {
          if (change < 1) {
            return site;
          }

          return {
            ...site,
            items: [
              ...site.items,
              {
                id: crypto.randomUUID(),
                itemId,
                quantity: 1,
                notes: "",
              },
            ],
          };
        }

        const newQuantity =
          existing.quantity + change;

        if (newQuantity <= 0) {
          return {
            ...site,
            items: site.items.filter(
              (item) => item.itemId !== itemId
            ),
          };
        }

        return {
          ...site,
          items: site.items.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  quantity: newQuantity,
                }
              : item
          ),
        };
      }
    );

    setEstimate({
      ...estimate,
      jobSites: updatedJobSites,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Items
        </h2>

        <p className="mt-1 text-slate-500">
          Select items found in this area.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-slate-500">
            No matching items.
          </div>
        ) : (
          filteredItems.map((item) => {
            const estimateItem =
              getEstimateItem(item.id);

            return (
              <ItemCard
                key={item.id}
                title={item.name}
                category={item.category}
                selected={!!estimateItem}
                quantity={
                  estimateItem?.quantity ?? 1
                }
                onClick={() =>
                  updateItemQuantity(
                    item.id,
                    estimateItem ? -1 : 1
                  )
                }
                onIncrease={() =>
                  updateItemQuantity(item.id, 1)
                }
                onDecrease={() =>
                  updateItemQuantity(item.id, -1)
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}