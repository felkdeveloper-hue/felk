import type { AnalyticsFilter } from '@/schemas/analytics/index.js';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ExportScope = 'all' | 'page';

export interface ExportColumn {
  key: string;
  header: string;
  /** Optional formatter for cell values */
  format?: (value: unknown, row: Record<string, unknown>) => string | number | null | undefined;
}

export interface ExportSheetDefinition {
  name: string;
  columns: ExportColumn[];
  fetch: (ctx: ExportFetchContext) => Promise<Record<string, unknown>[]>;
}

export interface ExportKpi {
  label: string;
  value: string | number;
}

export interface ExportReportDefinition {
  id: string;
  title: string;
  description?: string;
  sheets: ExportSheetDefinition[];
  /** Optional KPI summary for PDF / Summary sheet */
  getKpis?: (ctx: ExportFetchContext) => Promise<ExportKpi[]>;
}

export interface ExportFetchContext {
  filter: AnalyticsFilter;
  scope: ExportScope;
  columns?: string[];
  drillLabel?: string | null;
}

export interface ExportRequest {
  reportType: string;
  format: ExportFormat;
  filter?: AnalyticsFilter;
  scope?: ExportScope;
  columns?: string[];
  drillLabel?: string;
}

export interface ExportResult {
  async?: false;
  buffer: Buffer;
  fileName: string;
  contentType: string;
  recordCount: number;
  reportTitle: string;
}

export interface AsyncExportResult {
  async: true;
  jobId: string;
  status: string;
}

export type CreateExportResult = ExportResult | AsyncExportResult;

export interface ResolvedExportData {
  report: ExportReportDefinition;
  sheets: Array<{
    name: string;
    columns: ExportColumn[];
    rows: Record<string, unknown>[];
  }>;
  kpis: ExportKpi[];
  filter: AnalyticsFilter;
  drillLabel?: string | null;
  recordCount: number;
}

export const SYNC_ROW_THRESHOLD = 5_000;
export const MAX_EXPORT_ROWS = 50_000;
