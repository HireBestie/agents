import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";

type FtueStep = {
  id: string;
  title: string;
  status: "complete" | "current" | "upcoming";
};

type FtueStepperProps = {
  steps: FtueStep[];
};

export function FtueStepper({ steps }: FtueStepperProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Onboarding progress">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`rounded-sm border px-3 py-3 text-left ${
            step.status === "current"
              ? "border-primary bg-primary/10"
              : step.status === "complete"
                ? "border-arena-yes/40 bg-arena-yes/5"
                : "border-border bg-background/50"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            {step.status === "complete" ? (
              <CheckCircle2Icon className="size-3.5 shrink-0 text-arena-yes" />
            ) : (
              <CircleDashedIcon
                className={`size-3.5 shrink-0 ${
                  step.status === "current" ? "text-primary" : "text-muted-foreground"
                }`}
              />
            )}
            <span className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">
              Step {index + 1}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{step.title}</p>
        </li>
      ))}
    </ol>
  );
}
