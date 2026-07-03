type StepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
};

export default function StepHeader({
  step,
  totalSteps,
  title,
  description,
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
    </div>
  );
}