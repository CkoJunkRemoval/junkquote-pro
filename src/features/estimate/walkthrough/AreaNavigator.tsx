"use client";

interface AreaNavigatorProps {
  current: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function AreaNavigator({
  current,
  total,
  onPrevious,
  onNext,
}: AreaNavigatorProps) {
  const first = current === 0;
  const last = current === total - 1;

  return (
    <div className="flex items-center justify-between pt-4">

      <button
        type="button"
        onClick={onPrevious}
        disabled={first}
        className="rounded-xl border px-5 py-3 disabled:opacity-40"
      >
        ← Previous Area
      </button>

      <button
        type="button"
        className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 transition"
      >
        ✓ Complete Area
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={last}
        className="rounded-xl border px-5 py-3 disabled:opacity-40"
      >
        Next Area →
      </button>

    </div>
  );
}