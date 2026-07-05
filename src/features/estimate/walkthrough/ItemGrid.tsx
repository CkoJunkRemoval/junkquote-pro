"use client";

import { useMemo, useState } from "react";

import ItemCard from "@/components/estimate/ItemCard";
import { ITEM_LIBRARY } from "@/data/items";

interface ItemGridProps {
  areaName: string;
}

export default function ItemGrid({
  areaName,
}: ItemGridProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    return ITEM_LIBRARY.filter((item) => {
      const matchesArea = item.commonAreas.includes(areaName);

      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesArea && matchesSearch;
    });
  }, [areaName, search]);

  return (
    <div className="space-y-6">

      <div>

        <h2 className="text-2xl font-bold">
          Items
        </h2>

        <p className="text-slate-500 mt-1">
          Select items found in this area.
        </p>

      </div>

      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {filteredItems.length === 0 ? (

          <div className="rounded-xl border border-dashed p-6 text-slate-500">

            No matching items.

          </div>

        ) : (

          filteredItems.map((item) => (

            <ItemCard
              key={item.id}
              title={item.name}
              category={item.category}
            />

          ))

        )}

      </div>

    </div>
  );
}