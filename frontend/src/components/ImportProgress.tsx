'use client';

interface ImportProgressProps {
  progress: number;       // 0–100
  processed: number;
  total: number;
  currentMessage: string;
  batchesCompleted: number;
  totalBatches: number;
}

export default function ImportProgress({
  progress,
  processed,
  total,
  currentMessage,
  batchesCompleted,
  totalBatches,
}: ImportProgressProps) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Main card */}
      <div className="card p-8 text-center space-y-6">
        {/* Animated AI icon */}
        <div className="relative inline-flex">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-brand-900/40">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>

          {/* Spinner ring */}
          <div className="absolute inset-0 rounded-3xl border-4 border-brand-200 dark:border-brand-900/50 border-t-brand-500 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Title + message */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            AI Processing Your Leads
          </h3>
          <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
            {currentMessage || 'Gemini AI is reading your CSV and intelligently mapping fields to GrowEasy CRM format...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full progress-bar-fill relative overflow-hidden"
              style={{ width: `${Math.max(2, progress)}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>{processed.toLocaleString()} of {total.toLocaleString()} records</span>
            <span className="font-semibold text-brand-500">{progress}%</span>
          </div>
        </div>

        {/* Batch pills */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: totalBatches }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-1.5 rounded-full transition-all duration-300 ${
                i < batchesCompleted
                  ? 'bg-brand-500'
                  : i === batchesCompleted
                  ? 'bg-brand-300 animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '📂', label: 'CSV Parsed', done: true },
            { icon: '🤖', label: 'AI Mapping', done: progress > 0 && progress < 100, active: progress > 0 && progress < 100 },
            { icon: '✅', label: 'Complete', done: progress === 100 },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                s.done
                  ? 'border-brand-200 dark:border-brand-900/40 bg-brand-50 dark:bg-brand-900/10'
                  : 'border-base bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              <span className={`text-[10px] font-semibold ${s.done ? 'text-brand-600 dark:text-brand-400' : 'text-muted'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI disclaimer */}
      <p className="text-center text-xs text-muted">
        Powered by Gemini gemini-2.5-flash · Processing in batches of 10 · Auto-retry on failure
      </p>
    </div>
  );
}
