'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import Papa from 'papaparse';
import type { ParsedCSV } from '@/types';

interface DropZoneProps {
  onFileAccepted: (file: File, data: ParsedCSV) => void;
  onError: (message: string) => void;
}

export default function DropZone({ onFileAccepted, onError }: DropZoneProps) {
  const [isParsing, setIsParsing] = useState(false);

  const processFile = useCallback((file: File) => {
    setIsParsing(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h: string) => h.trim(),
      transform: (value: string) => (typeof value === 'string' ? value.trim() : value),
      complete: (results) => {
        setIsParsing(false);
        const headers = results.meta.fields?.filter(Boolean) || [];
        const rows = (results.data || []).filter(row =>
          Object.values(row).some(v => v && v.toString().trim() !== '')
        );

        if (headers.length === 0 || rows.length === 0) {
          onError('The CSV file appears to be empty or has no valid data rows.');
          return;
        }

        onFileAccepted(file, { headers, rows });
      },
      error: (err: Error) => {
        setIsParsing(false);
        onError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, [onFileAccepted, onError]);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      onError(rejected[0].errors[0]?.message || 'Invalid file type. Please upload a .csv file.');
      return;
    }
    if (accepted[0]) {
      processFile(accepted[0]);
    }
  }, [processFile, onError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <div
        {...getRootProps()}
        className={`drop-zone cursor-pointer p-12 text-center focus:outline-none transition-all duration-200
          ${isDragActive && !isDragReject ? 'active' : ''}
          ${isDragReject ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : ''}
        `}
      >
        <input {...getInputProps()} aria-label="Upload CSV file" />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Parsing your CSV...</p>
          </div>
        ) : isDragActive && !isDragReject ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-brand-500">Drop your CSV file here</p>
          </div>
        ) : isDragReject ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-red-500">Only CSV files are supported</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-brand-50">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>

            <div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Drop your CSV file here
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
                or <span className="text-brand-500 font-medium underline underline-offset-2">click to browse files</span>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 text-xs text-slate-400 dark:text-slate-600">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Supported: .csv (max 50MB)</span>
              </div>
              <p className="text-center max-w-xs leading-relaxed">
                Works with Facebook Ads, Google Ads, real estate CRMs, Excel exports, and custom spreadsheets
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sample CSV download */}
      <div className="flex justify-center">
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            'created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description\n' +
            '2026-05-13 14:20:48,John Doe,john.doe@example.com,+91,9876543210,GrowEasy,Mumbai,Maharashtra,India,agent@groweasy.com,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo,eden_park,,\n' +
            '2026-05-13 14:25:30,Sarah Johnson,sarah.johnson@example.com,+91,9876543211,Tech Solutions,Bangalore,Karnataka,India,agent@groweasy.com,DID_NOT_CONNECT,"Person was busy, will try again next week",,,\n'
          )}`}
          download="sample_crm_leads.csv"
          className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Sample CSV Template
        </a>
      </div>
    </div>
  );
}
