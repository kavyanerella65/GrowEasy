// ─── CRM Field Types ──────────────────────────────────────────────────────────

export type CRMStatus = 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE' | '';

export type DataSource =
  | 'leads_on_demand'
  | 'meridian_tower'
  | 'eden_park'
  | 'varah_swamy'
  | 'sarjapur_plots'
  | '';

export interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CRMStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface SkippedRecord extends CRMRecord {
  _skipReason: string;
}

// ─── Import Result Types ─────────────────────────────────────────────────────

export interface ImportResult {
  totalImported: number;
  totalSkipped: number;
  totalProcessed: number;
  imported: CRMRecord[];
  skipped: SkippedRecord[];
}

// ─── CSV Parse Types ──────────────────────────────────────────────────────────

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

// ─── SSE Event Types ──────────────────────────────────────────────────────────

export type SSEEventType = 'start' | 'progress' | 'complete' | 'error';

export interface SSEStartEvent {
  type: 'start';
  total: number;
  headers: string[];
  message: string;
}

export interface SSEProgressEvent {
  type: 'progress';
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

export interface SSECompleteEvent extends ImportResult {
  type: 'complete';
  message: string;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export type SSEEvent = SSEStartEvent | SSEProgressEvent | SSECompleteEvent | SSEErrorEvent;

// ─── App Step Types ───────────────────────────────────────────────────────────

export type AppStep = 1 | 2 | 3 | 4;

export interface StepInfo {
  number: AppStep;
  label: string;
  description: string;
}

// ─── CRM Display Helpers ──────────────────────────────────────────────────────

export const CRM_STATUS_LABELS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'Good Lead',
  DID_NOT_CONNECT: 'Not Connected',
  BAD_LEAD: 'Bad Lead',
  SALE_DONE: 'Sale Done',
};

export const CRM_STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  DID_NOT_CONNECT: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  BAD_LEAD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  SALE_DONE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};
