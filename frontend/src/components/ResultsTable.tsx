'use client';

import { useState, useMemo } from 'react';
import type { ImportResult, CRMRecord, SkippedRecord } from '@/types';
import { CRM_STATUS_LABELS, CRM_STATUS_COLORS } from '@/types';

interface ResultsTableProps {
  results: ImportResult;
  onReset: () => void;
}

type TabType = 'imported' | 'skipped';

const CRM_FIELDS: Array<{ key: keyof CRMRecord; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_without_country_code', label: 'Mobile' },
  { key: 'country_code', label: 'Code' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'crm_status', label: 'Status' },
  { key: 'data_source', label: 'Source' },
  { key: 'lead_owner', label: 'Owner' },
  { key: 'created_at', label: 'Created At' },
  { key: 'crm_note', label: 'Notes' },
  { key: 'possession_time', label: 'Possession' },
  { key: 'description', label: 'Description' },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function exportToCSV(records: CRMRecord[], filename: string) {
  const headers = CRM_FIELDS.map(f => f.key).join(',');
  const rows = records.map(r =>
    CRM_FIELDS.map(f => {
      const val = r[f.key] || '';
      return `"${val.toString().replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ResultsTable({ results, onReset }: ResultsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('imported');
  const [search, setSearch] = useState('');
  const [visibleRows, setVisibleRows] = useState(100);

  const { totalImported, totalSkipped, totalProcessed, imported, skipped } = results;
  const successRate = totalProcessed > 0
    ? Math.round((totalImported / totalProcessed) * 100)
    : 0;

  const activeRecords: (CRMRecord | SkippedRecord)[] = activeTab === 'imported' ? imported : skipped;

  const filtered = useMemo(() => {
    if (!search.trim()) return activeRecords;
    const q = search.toLowerCase();
    return activeRecords.filter(r =>
      Object.values(r).some(v => v?.toString().toLowerCase().includes(q))
    );
  }, [activeRecords, search]);

  const displayed = filtered.slice(0, visibleRows);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon="📋"
          value={totalProcessed}
          label="Total Records"
          color="slate"
        />
        <SummaryCard
          icon="✅"
          value={totalImported}
          label="Imported"
          color="emerald"
        />
        <SummaryCard
          icon="⏭️"
          value={totalSkipped}
          label="Skipped"
          color="amber"
        />
        <SummaryCard
          icon="📈"
          value={`${successRate}%`}
          label="Success Rate"
          color="brand"
        />
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex rounded-xl border border-base overflow-hidden text-sm font-medium">
          <button
            onClick={() => { setActiveTab('imported'); setSearch(''); setVisibleRows(100); }}
            className={`px-4 py-2 transition-colors ${
              activeTab === 'imported'
                ? 'bg-brand-500 text-white'
                : 'text-muted hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Imported ({totalImported.toLocaleString()})
          </button>
          <button
            onClick={() => { setActiveTab('skipped'); setSearch(''); setVisibleRows(100); }}
            className={`px-4 py-2 transition-colors ${
              activeTab === 'skipped'
                ? 'bg-amber-500 text-white'
                : 'text-muted hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Skipped ({totalSkipped.toLocaleString()})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleRows(100); }}
              placeholder="Search results..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-base bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all w-44"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Export */}
          {totalImported > 0 && (
            <button
              onClick={() => exportToCSV(imported, 'groweasy_crm_import.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/50 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          )}

          {/* New import */}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Import
          </button>
        </div>
      </div>

      {/* Results count line */}
      {search && (
        <p className="text-xs text-muted">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: '500px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                {activeTab === 'skipped' && <th className="text-amber-600">Skip Reason</th>}
                {CRM_FIELDS.map(f => (
                  <th key={f.key}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td
                    colSpan={CRM_FIELDS.length + (activeTab === 'skipped' ? 2 : 1)}
                    className="text-center py-16 text-muted"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">{search ? '🔍' : activeTab === 'imported' ? '📭' : '🎉'}</span>
                      <p className="text-sm font-medium">
                        {search
                          ? 'No matching records'
                          : activeTab === 'imported'
                          ? 'No records were imported'
                          : 'No records were skipped!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((record, i) => {
                  const r = record as CRMRecord & { _skipReason?: string };
                  return (
                    <tr key={i}>
                      <td className="text-center text-xs text-muted">{i + 1}</td>
                      {activeTab === 'skipped' && (
                        <td>
                          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full max-w-[160px] block truncate" title={r._skipReason}>
                            {r._skipReason}
                          </span>
                        </td>
                      )}
                      {CRM_FIELDS.map(f => {
                        const val = r[f.key];
                        if (f.key === 'crm_status' && val) {
                          return (
                            <td key={f.key}>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${CRM_STATUS_COLORS[val] || 'bg-slate-100 text-slate-600'}`}>
                                {CRM_STATUS_LABELS[val] || val}
                              </span>
                            </td>
                          );
                        }
                        if (f.key === 'created_at') {
                          return (
                            <td key={f.key} className="text-xs text-muted whitespace-nowrap">
                              {formatDate(val as string)}
                            </td>
                          );
                        }
                        if (f.key === 'data_source' && val) {
                          return (
                            <td key={f.key}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                {val}
                              </span>
                            </td>
                          );
                        }
                        if (f.key === 'mobile_without_country_code' && val) {
                          return (
                            <td key={f.key} className="whitespace-nowrap">
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {r.country_code ? `${r.country_code} ` : ''}{val}
                              </span>
                            </td>
                          );
                        }
                        if (f.key === 'country_code') return null;

                        return (
                          <td key={f.key} title={val as string}>
                            {val ? (
                              <span className="block max-w-[160px] truncate text-slate-700 dark:text-slate-300">
                                {val as string}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {visibleRows < filtered.length && (
          <div className="border-t border-base py-2.5 px-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-xs text-muted">
              Showing {Math.min(visibleRows, filtered.length)} of {filtered.length.toLocaleString()} records
            </span>
            <button
              onClick={() => setVisibleRows(v => v + 100)}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  icon, value, label, color,
}: {
  icon: string;
  value: number | string;
  label: string;
  color: 'slate' | 'emerald' | 'amber' | 'brand';
}) {
  const colorMap = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40',
    brand: 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-900/40',
  };
  const textMap = {
    slate: 'text-slate-800 dark:text-slate-200',
    emerald: 'text-emerald-800 dark:text-emerald-300',
    amber: 'text-amber-800 dark:text-amber-300',
    brand: 'text-brand-700 dark:text-brand-300',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-muted font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textMap[color]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
