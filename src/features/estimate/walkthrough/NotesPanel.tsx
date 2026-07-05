"use client";

export default function NotesPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">
        Notes
      </h2>

      <textarea
        placeholder="Add notes for this area..."
        className="h-40 w-full resize-none rounded-xl border border-slate-300 p-4 outline-none focus:border-blue-500"
      />
    </div>
  );
}