"use client";

export default function PhotoPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Photos</h2>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
          0 Photos
        </span>
      </div>

      <div className="flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="font-medium text-slate-700">
            Photos Coming Soon
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Drag & drop or take photos from your device.
          </p>
        </div>
      </div>
    </div>
  );
}