import { CheckCircle2 } from "lucide-react";

interface Step {
  label: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="mb-8 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {steps.map((step, i) => (
          <div key={step.label} className="contents">
            {i > 0 && <div className="h-px flex-1 bg-gray-200" />}
            <div
              className={`flex items-center gap-2 text-sm ${
                i < currentStep
                  ? "text-primary"
                  : i === currentStep
                    ? "text-gray-900"
                    : "text-gray-400"
              }`}
            >
              {i < currentStep ? (
                <CheckCircle2 className="size-5 text-primary" />
              ) : (
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-xs ${
                    i === currentStep
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className={i === currentStep ? "font-semibold" : "font-medium"}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
