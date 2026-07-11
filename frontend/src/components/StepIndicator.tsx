'use client';

import type { AppStep, StepInfo } from '@/types';

const STEPS: StepInfo[] = [
  { number: 1, label: 'Upload CSV', description: 'Select your file' },
  { number: 2, label: 'Preview', description: 'Review your data' },
  { number: 3, label: 'Processing', description: 'AI extraction' },
  { number: 4, label: 'Results', description: 'Import complete' },
];

interface StepIndicatorProps {
  currentStep: AppStep;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Import progress" className="w-full max-w-2xl mx-auto">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isDone = currentStep > step.number;
          const isActive = currentStep === step.number;
          const isFuture = currentStep < step.number;

          return (
            <li key={step.number} className="flex items-center flex-1">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-out
                    ${isDone
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-200 dark:shadow-brand-900/40'
                      : isActive
                      ? 'bg-brand-500 text-white ring-4 ring-brand-200 dark:ring-brand-900/60 shadow-md shadow-brand-200 dark:shadow-brand-900/40'
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700'
                    }
                  `}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                <div className="text-center hidden sm:block">
                  <p className={`text-xs font-semibold leading-none mb-0.5 ${isActive ? 'text-brand-500' : isDone ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-none">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 mb-5 hidden sm:block">
                  <div className="h-0.5 rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-brand-500 transition-all duration-500 ease-out"
                      style={{ width: currentStep > step.number ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
