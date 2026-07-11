'use client';

import { useState, useCallback, useEffect } from 'react';
import StepIndicator from '@/components/StepIndicator';
import DropZone from '@/components/DropZone';
import PreviewTable from '@/components/PreviewTable';
import ImportProgress from '@/components/ImportProgress';
import ResultsTable from '@/components/ResultsTable';
import type { AppStep, ParsedCSV, ImportResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BATCH_SIZE = 10;

export default function Home() {
  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<AppStep>(1);
  const [darkMode, setDarkMode] = useState(false);

  // Step 1 → 2
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedCSV>({ headers: [], rows: [] });

  // Step 3
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [batchesCompleted, setBatchesCompleted] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  // Step 4
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Error
  const [errorMsg, setErrorMsg] = useState('');

  // ── Dark mode toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFileAccepted = useCallback((file: File, data: ParsedCSV) => {
    setCsvFile(file);
    setCsvData(data);
    setErrorMsg('');
    setStep(2);
  }, []);

  const handleReset = useCallback(() => {
    setCsvFile(null);
    setCsvData({ headers: [], rows: [] });
    setImportResult(null);
    setProgress(0);
    setProcessed(0);
    setBatchesCompleted(0);
    setTotalBatches(0);
    setProgressMessage('');
    setErrorMsg('');
    setStep(1);
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!csvFile) return;

    setStep(3);
    setProgress(0);
    setProcessed(0);
    setProgressMessage('Uploading and parsing CSV...');
    setErrorMsg('');

    const total = csvData.rows.length;
    const batches = Math.ceil(total / BATCH_SIZE);
    setTotalBatches(batches);
    setBatchesCompleted(0);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`${API_URL}/api/import/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || `Server error ${response.status}`);
      }

      if (!response.body) throw new Error('No response body from server.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const messages = buffer.split('\n\n');
        buffer = messages.pop() ?? '';

        for (const msg of messages) {
          const line = msg.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'start') {
              setProgressMessage(event.message);
            } else if (event.type === 'progress') {
              setProcessed(event.processed);
              setProgress(event.percentage);
              setProgressMessage(event.message);
              setBatchesCompleted(Math.ceil(event.processed / BATCH_SIZE));
            } else if (event.type === 'complete') {
              setProgress(100);
              setProcessed(event.totalProcessed);
              setImportResult({
                totalImported: event.totalImported,
                totalSkipped: event.totalSkipped,
                totalProcessed: event.totalProcessed,
                imported: event.imported,
                skipped: event.skipped,
              });
              setBatchesCompleted(batches);
              // Brief pause so user sees 100% before results appear
              await new Promise(r => setTimeout(r, 600));
              setStep(4);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // Skip malformed SSE lines
            console.warn('SSE parse error:', parseErr);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed. Please try again.';
      setErrorMsg(message);
      setStep(2);
    }
  }, [csvFile, csvData.rows.length]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen transition-colors duration-200">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-base">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <a href="https://groweasy.ai" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
              Grow<span className="text-brand-500">Easy</span>
            </span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium">
              AI CSV Importer
            </span>
          </a>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-xl border border-base flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Import Leads via CSV
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto">
            Upload any CSV — our AI intelligently maps fields into GrowEasy CRM format regardless of column names
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Error banner */}
        {errorMsg && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 animate-fade-in">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-400">Import failed</p>
              <p className="text-xs text-red-700 dark:text-red-500 mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: '📊', label: 'Facebook Ads Export', desc: 'full_name, phone_number...' },
                  { icon: '🎯', label: 'Google Ads CSV', desc: 'Customer Name, Phone...' },
                  { icon: '🏠', label: 'Real Estate CRM', desc: 'Client, Mobile, Project...' },
                ].map(s => (
                  <div key={s.label} className="card p-3 flex items-center gap-3 opacity-80">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</p>
                      <p className="text-[10px] text-muted font-mono">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <DropZone
                onFileAccepted={handleFileAccepted}
                onError={setErrorMsg}
              />
            </div>
          )}

          {step === 2 && csvFile && (
            <PreviewTable
              file={csvFile}
              data={csvData}
              onConfirm={handleConfirmImport}
              onReset={handleReset}
            />
          )}

          {step === 3 && (
            <ImportProgress
              progress={progress}
              processed={processed}
              total={csvData.rows.length}
              currentMessage={progressMessage}
              batchesCompleted={batchesCompleted}
              totalBatches={totalBatches}
            />
          )}

          {step === 4 && importResult && (
            <ResultsTable
              results={importResult}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-base py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <p>© 2026 GrowEasy · AI-powered lead management</p>
          <p>Built with Next.js · Express · Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
