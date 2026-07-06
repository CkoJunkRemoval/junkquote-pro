"use client";

interface ItemCardProps {
  title: string;
  category: string;

  selected: boolean;

  quantity?: number;

  onClick: () => void;

  onIncrease?: () => void;

  onDecrease?: () => void;
}

export default function ItemCard({
  title,
  category,
  selected,
  quantity = 1,
  onClick,
  onIncrease,
  onDecrease,
}: ItemCardProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
        selected
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 hover:border-blue-400 hover:shadow-sm"
      }`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">
            {title}
          </h3>

          <p className="text-sm text-slate-500">
            {category}
          </p>
        </div>

        {selected && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDecrease?.();
              }}
              className="h-8 w-8 rounded-lg border border-slate-300 hover:bg-slate-100"
            >
              −
            </button>

            <span className="text-lg font-bold">
              {quantity}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIncrease?.();
              }}
              className="h-8 w-8 rounded-lg border border-slate-300 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}