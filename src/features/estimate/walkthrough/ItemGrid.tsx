"use client";

import { useMemo, useState } from "react";

import ItemCard from "@/components/estimate/ItemCard";
import { ITEM_LIBRARY, type ItemDefinition } from "@/data/items";

import { createEstimateItemAction } from "@/app/actions/estimateItems/createEstimateItem";
import { deleteEstimateItemAction } from "@/app/actions/estimateItems/deleteEstimateItem";
import { updateEstimateItemAction } from "@/app/actions/estimateItems/updateEstimateItem";
import { calculateJobSiteSubtotal } from "@/data/pricing/calculateEstimate";

import { useEstimate } from "../EstimateContext";
import { toEstimateItem } from "../estimateItemMapper";
import type { EstimateItem, JobSite } from "../types";

interface ItemGridProps {
  jobSite: JobSite;
}

export default function ItemGrid({
  jobSite,
}: ItemGridProps) {
  const { estimate, setJobSites } = useEstimate();
  const [search, setSearch] = useState("");
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

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

  function setItems(items: EstimateItem[]) {
    setJobSites(
      estimate.jobSites.map((site) =>
        site.id === jobSite.id
          ? {
              ...site,
              items,
              subtotal: calculateJobSiteSubtotal({
                ...site,
                items,
              }),
            }
          : site
      )
    );
  }

  async function updateItemQuantity(
    item: ItemDefinition,
    change: number
  ) {
    const existing = getEstimateItem(item.id);

    if (savingItemId || (!existing && change < 1)) {
      return;
    }

    setSavingItemId(existing?.id ?? item.id);

    try {
      if (!existing) {
        const createdItem = await createEstimateItemAction({
          jobSiteId: jobSite.id,
          itemId: item.id,
          name: item.name,
          category: item.category,
          quantity: 1,
          sortOrder: jobSite.items.length,
        });

        setItems([
          ...jobSite.items,
          toEstimateItem(createdItem),
        ]);
        return;
      }

      const quantity = existing.quantity + change;

      if (quantity <= 0) {
        await deleteEstimateItemAction(existing.id);
        setItems(
          jobSite.items.filter(
            (currentItem) => currentItem.id !== existing.id
          )
        );
        return;
      }

      const updatedItem = await updateEstimateItemAction({
        id: existing.id,
        quantity,
      });

      setItems(
        jobSite.items.map((currentItem) =>
          currentItem.id === existing.id
            ? toEstimateItem(updatedItem)
            : currentItem
        )
      );
    } catch (error) {
      console.error("Estimate item update failed:", error);
    } finally {
      setSavingItemId(null);
    }
  }

  async function persistItem(
    item: EstimateItem,
    changes: {
      notes?: string;
      priceOverride?: number | null;
    }
  ) {
    if (savingItemId) {
      return;
    }

    setSavingItemId(item.id);

    try {
      const updatedItem = await updateEstimateItemAction({
        id: item.id,
        ...changes,
      });

      setItems(
        jobSite.items.map((currentItem) =>
          currentItem.id === item.id
            ? toEstimateItem(updatedItem)
            : currentItem
        )
      );
    } catch (error) {
      console.error("Estimate item update failed:", error);
    } finally {
      setSavingItemId(null);
    }
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
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-slate-500">
            No matching items.
          </div>
        ) : (
          filteredItems.map((item) => {
            const estimateItem = getEstimateItem(item.id);
            const isSaving = savingItemId === (estimateItem?.id ?? item.id);

            return (
              <div key={item.id} className="space-y-3">
                <ItemCard
                  title={item.name}
                  category={item.category}
                  selected={Boolean(estimateItem)}
                  quantity={estimateItem?.quantity ?? 1}
                  onClick={() =>
                    void updateItemQuantity(
                      item,
                      estimateItem ? -1 : 1
                    )
                  }
                  onIncrease={() =>
                    void updateItemQuantity(item, 1)
                  }
                  onDecrease={() =>
                    void updateItemQuantity(item, -1)
                  }
                />

                {estimateItem && (
                  <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                    <textarea
                      placeholder="Item notes"
                      defaultValue={estimateItem.notes}
                      onBlur={(event) =>
                        void persistItem(estimateItem, {
                          notes: event.target.value,
                        })
                      }
                      disabled={isSaving}
                      className="min-h-20 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100"
                    />

                    <input
                      key={`${estimateItem.id}-${estimateItem.priceOverride ?? "default"}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price override"
                      defaultValue={estimateItem.priceOverride ?? ""}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        const priceOverride =
                          value === "" ? null : Number(value);

                        if (
                          priceOverride !== null &&
                          !Number.isFinite(priceOverride)
                        ) {
                          return;
                        }

                        void persistItem(estimateItem, {
                          priceOverride,
                        });
                      }}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
