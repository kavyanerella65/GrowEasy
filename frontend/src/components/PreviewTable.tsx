'use client';

import { useState, useMemo } from 'react';
import type { ParsedCSV } from '@/types';

interface PreviewTableProps {
  file: File;
  data: ParsedCSV;
  onConfirm: () => void;
  onReset: () => void;
}

const PAGE_SIZE = 100;

export default function PreviewTable({ file, data, onConfirm, onReset }: PreviewTableProps) {
  const [visibleRows, setVisibleRows] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');

  const { headers, rows } = data;

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(v => v?.toString().toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const displayedRows = filteredRows.slice(0, visibleRows);
  const hasMore = visibleRows < filteredRows.length;

  const fileSizeKB = (file.size / 1024).toFixed(1);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* File info banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-base card">
        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
          <p className="text-xs text-muted">
            {fileSizeKB} KB · {rows.length.toLocaleString()} records · {headers.length} columns
          </p>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
        >
          Change file
        </button>
      </div>

      {/* Table header bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Data Preview
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {filteredRows.length < rows.length
              ? `Showing ${filteredRows.length} of ${rows.length.toLocaleString()} records (filtered)`
              : `Showing ${Math.min(visibleRows, filteredRows.length)} of ${rows.length.toLocaleString()} records`}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setVisibleRows(PAGE_SIZE); }}
            placeholder="Search preview..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-base bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all w-48"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="card overflow-hidden">
        <div
          className="overflow-auto"
          style={{ maxHeight: '420px' }}
          role="region"
          aria-label="CSV data preview"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center text-muted">#</th>
                {headers.map(header => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} className="text-center py-12 text-muted text-sm">
                    No matching records found
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, i) => (
                  <tr key={i}>
                    <td className="text-center text-muted text-xs">{i + 1}</td>
                    {headers.map(header => (
                      <td
                        key={header}
                        title={row[header] || '—'}
                        className="text-slate-700 dark:text-slate-300"
                      >
                        {row[header] ? (
                          <span className="block max-w-[180px] truncate">{row[header]}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="border-t border-base py-2.5 px-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-xs text-muted">
              {filteredRows.length - visibleRows} more records not shown
            </span>
            <button
              onClick={() => setVisibleRows(v => v + PAGE_SIZE)}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Load {Math.min(PAGE_SIZE, filteredRows.length - visibleRows)} more
            </button>
          </div>
        )}
      </div>

      {/* Note about AI processing */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          AI processing has not started yet. Click <strong>Confirm Import</strong> to extract and map your{' '}
          {rows.length.toLocaleString()} records into GrowEasy CRM format.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onReset}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl border border-base hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-200 dark:shadow-brand-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Confirm Import ({rows.length.toLocaleString()} records)
        </button>
      </div>
    </div>
  );
}
