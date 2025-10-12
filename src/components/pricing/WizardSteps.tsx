import { twMerge } from 'tailwind-merge';

export interface WizardStep {
  id: number;
  label: string;
  description: string;
}

export interface WizardStepsProps {
  steps: WizardStep[];
  current: number;
}

export function WizardSteps({ steps, current }: WizardStepsProps) {
  return (
    <ol className="grid gap-2 grid-cols-2 sm:gap-3 lg:grid-cols-5">
      {steps.map((step) => {
        const active = step.id === current;
        const completed = step.id < current;
        return (
          <li key={step.id} className={twMerge('flex h-full items-center gap-2 rounded-xl px-2 py-2 sm:px-3', active ? 'bg-brand-accent/10 text-brand-accent' : 'bg-white text-slate-600 shadow-sm')}>
            <span
              className={twMerge(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                completed ? 'bg-brand-accent text-white' : active ? 'bg-brand-accent text-white' : 'bg-slate-200 text-slate-700',
              )}
            >
              {completed ? '✓' : step.id}
            </span>
            <span className="min-w-0">
              <span className="block text-xs sm:text-sm font-semibold truncate">{step.label}</span>
              <span className="hidden sm:block text-xs text-slate-500 truncate">{step.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
