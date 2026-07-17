type StepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  estimateId?: string | null;
  customerName?: string;
  onBackToEstimates?: () => void;
};

export default function StepHeader({
  step,
  totalSteps,
  title,
  description,
  estimateId,
  customerName,
  onBackToEstimates,
}: StepHeaderProps) {
  return (
    <div className="mb-10">
      {onBackToEstimates && (
        <button
          type="button"
          onClick={onBackToEstimates}
          className="mb-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Estimates
        </button>
      )}
      <p className="text-sm font-semibold text-blue-600">
        Step {step} of {totalSteps}
      </p>

      <h1 className="text-4xl font-bold mt-2">
        {title}
      </h1>

      <p className="text-slate-500 mt-2">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">
          Draft Estimate
        </span>
        <span>
          Estimate ID: {estimateId ?? "Pending"}
        </span>
        <span>
          Customer Name: {customerName || "Not selected"}
        </span>
      </div>
    </div>
  );
}
