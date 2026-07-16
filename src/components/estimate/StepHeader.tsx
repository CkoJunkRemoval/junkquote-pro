type StepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  estimateId?: string | null;
  customerName?: string;
};

export default function StepHeader({
  step,
  totalSteps,
  title,
  description,
  estimateId,
  customerName,
}: StepHeaderProps) {
  return (
    <div className="mb-10">
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
