"use client";

interface ItemCardProps {
  title: string;
  category: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function ItemCard({
  title,
  category,
  selected = false,
  onClick,
}: ItemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 hover:border-blue-400 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between">

        <div>

          <h3 className="font-semibold text-lg">
            {title}
          </h3>

          <p className="text-sm text-slate-500">
            {category}
          </p>

        </div>

        {selected && (
          <div className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            Selected
          </div>
        )}

      </div>
    </button>
  );
}