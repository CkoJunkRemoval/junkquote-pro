import type { OnboardingSection } from "@/lib/onboarding/service";

const labels: Record<OnboardingSection, string> = {
  profile: "Profile",
  branding: "Branding",
  pricing: "Pricing",
  "service-area": "Service areas",
  team: "Team",
  equipment: "Equipment",
  preferences: "Preferences",
  communication: "Communication",
  demo: "Demo",
};

export default function OnboardingProgressChips({
  sections,
  completed,
  currentStep,
}: {
  sections: readonly OnboardingSection[];
  completed: ReadonlySet<string>;
  currentStep: number;
}) {
  const currentIndex = Math.max(0, Math.min(sections.length - 1, currentStep - 1));
  return (
    <nav aria-label="Onboarding progress" className="mt-3 flex flex-wrap gap-2">
      {sections.map((section, index) => {
        const complete = completed.has(section);
        const current = !complete && index === currentIndex;
        const state = complete ? "complete" : current ? "current" : "incomplete";
        const colors = complete
          ? "border-emerald-500 bg-emerald-950 text-emerald-100 hover:bg-emerald-900"
          : current
            ? "border-orange-300 bg-orange-500 text-slate-950 hover:bg-orange-400"
            : "border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-400 hover:bg-slate-800";
        return (
          <a
            key={section}
            href={`#onboarding-${section}`}
            aria-current={current ? "step" : undefined}
            data-state={state}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${colors}`}
          >
            {complete ? <span aria-hidden="true">✓&nbsp;</span> : null}
            {labels[section]}
          </a>
        );
      })}
    </nav>
  );
}
