import { Types } from 'mongoose';
import { logger } from '@/config/logger.js';
import { writeAuditLog } from '@/services/audit.service.js';
import { storageService } from '@/services/storage.factory.js';
import { AnalyticsExportJobModel } from '@/models/analytics/export-job.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { getExportReport, listExportReports, resolveSheetColumns } from './export.registry.js';
import { generateCsv } from './csv.generator.js';
import { generateExcel } from './excel.generator.js';
import { generatePdf } from './pdf.generator.js';
import type {
  CreateExportResult,
  ExportFormat,
  ExportRequest,
  ResolvedExportData,
} from './export.types.js';
import { SYNC_ROW_THRESHOLD } from './export.types.js';

async function loadBranding(): Promise<{ storeName: string; logoUrl?: string | null }> {
  try {
    const { StoreSettingModel } = await import('@/models/settings.models.js');
    const rows = await StoreSettingModel.find({
      key: { $in: ['store.name', 'storeName', 'store.logo', 'storeLogo'] },
      isDeleted: false,
    })
      .select('key value')
      .lean();
    const map = new Map(rows.map((r) => [String(r.key), r.value]));
    const nameVal = map.get('store.name') ?? map.get('storeName');
    const logoVal = map.get('store.logo') ?? map.get('storeLogo');
    return {
      storeName: typeof nameVal === 'string' && nameVal.trim() ? nameVal : 'Analytics',
      logoUrl: typeof logoVal === 'string' ? logoVal : null,
    };
  } catch {
    return { storeName: 'Analytics', logoUrl: null };
  }
}

async function resolveExportData(req: ExportRequest): Promise<ResolvedExportData> {
  const report = getExportReport(req.reportType);
  if (!report) {
    throw Object.assign(new Error(`Unknown report type: ${req.reportType}`), { statusCode: 400 });
  }

  const filter = (req.filter ?? { period: '30d' }) as AnalyticsFilter;
  const scope = req.scope ?? 'all';
  const ctx = {
    filter,
    scope,
    columns: req.columns,
    drillLabel: req.drillLabel ?? null,
  };

  const sheets = [];
  for (let i = 0; i < report.sheets.length; i++) {
    const sheet = report.sheets[i]!;
    const columns = resolveSheetColumns(report, i, req.columns);
    const rows = await sheet.fetch(ctx);
    sheets.push({ name: sheet.name, columns, rows });
  }

  const kpis = report.getKpis ? await report.getKpis(ctx) : [];
  const recordCount = sheets.reduce((sum, s) => sum + s.rows.length, 0);

  return {
    report,
    sheets,
    kpis,
    filter,
    drillLabel: req.drillLabel ?? null,
    recordCount,
  };
}

function contentTypeFor(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
  }
}

function fileNameFor(title: string, format: ExportFormat): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug}-${stamp}.${format === 'xlsx' ? 'xlsx' : format}`;
}

async function renderBuffer(data: ResolvedExportData, format: ExportFormat): Promise<Buffer> {
  const branding = await loadBranding();
  if (format === 'csv') {
    // CSV: first sheet only (raw data)
    const primary = data.sheets[0];
    if (!primary) return Buffer.from('\uFEFF', 'utf8');
    return generateCsv(primary.columns, primary.rows);
  }
  if (format === 'xlsx') {
    return generateExcel(data, branding);
  }
  return generatePdf(data, branding);
}

export async function createAnalyticsExport(
  req: ExportRequest,
  actor: { userId?: string | null; ip?: string | null; userAgent?: string | null },
): Promise<CreateExportResult> {
  const data = await resolveExportData(req);
  const format = req.format;
  const fileName = fileNameFor(data.report.title, format);
  const contentType = contentTypeFor(format);

  const shouldAsync = data.recordCount > SYNC_ROW_THRESHOLD && format !== 'pdf';

  if (shouldAsync) {
    const job = await AnalyticsExportJobModel.create({
      reportType: req.reportType,
      reportTitle: data.report.title,
      format,
      status: 'processing',
      filter: req.filter ?? {},
      scope: req.scope ?? 'all',
      columns: req.columns ?? null,
      drillLabel: req.drillLabel ?? null,
      actorUserId: actor.userId ? new Types.ObjectId(actor.userId) : null,
      recordCount: data.recordCount,
      fileName,
      contentType,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    void processExportJob(String(job._id)).catch((err) => {
      logger.error({ err, jobId: job._id }, 'Async analytics export failed');
    });

    await writeAuditLog({
      action: 'reports.export',
      resourceType: 'analytics_export',
      resourceId: String(job._id),
      actorUserId: actor.userId ?? null,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        reportType: req.reportType,
        format,
        recordCount: data.recordCount,
        async: true,
        filter: req.filter ?? {},
      },
    });

    return { async: true, jobId: String(job._id), status: 'processing' };
  }

  const buffer = await renderBuffer(data, format);

  await writeAuditLog({
    action: 'reports.export',
    resourceType: 'analytics_export',
    actorUserId: actor.userId ?? null,
    ip: actor.ip,
    userAgent: actor.userAgent,
    metadata: {
      reportType: req.reportType,
      format,
      recordCount: data.recordCount,
      async: false,
      filter: req.filter ?? {},
      drillLabel: req.drillLabel,
    },
  });

  // Persist history entry for sync exports too
  await AnalyticsExportJobModel.create({
    reportType: req.reportType,
    reportTitle: data.report.title,
    format,
    status: 'ready',
    filter: req.filter ?? {},
    scope: req.scope ?? 'all',
    columns: req.columns ?? null,
    drillLabel: req.drillLabel ?? null,
    actorUserId: actor.userId ? new Types.ObjectId(actor.userId) : null,
    recordCount: data.recordCount,
    fileName,
    contentType,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    buffer,
    fileName,
    contentType,
    recordCount: data.recordCount,
    reportTitle: data.report.title,
  };
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = await AnalyticsExportJobModel.findById(jobId);
  if (!job || job.status === 'ready') return;

  try {
    const data = await resolveExportData({
      reportType: job.reportType,
      format: job.format,
      filter: job.filter as AnalyticsFilter,
      scope: job.scope,
      columns: job.columns ?? undefined,
      drillLabel: job.drillLabel ?? undefined,
    });
    const buffer = await renderBuffer(data, job.format);
    const key = `analytics-exports/${job.actorUserId ?? 'system'}/${jobId}-${job.fileName}`;
    const uploaded = await storageService.upload({
      key,
      body: buffer,
      contentType: job.contentType ?? contentTypeFor(job.format),
      isPublic: false,
    });

    job.status = 'ready';
    job.recordCount = data.recordCount;
    job.fileKey = uploaded.key;
    job.fileUrl = uploaded.url;
    job.error = null;
    await job.save();
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : 'Export failed';
    await job.save();
    throw err;
  }
}

export async function getExportJobForUser(jobId: string, userId: string) {
  return AnalyticsExportJobModel.findOne({
    _id: jobId,
    actorUserId: userId,
  }).lean();
}

export async function listExportHistory(userId: string, limit = 50) {
  return AnalyticsExportJobModel.find({ actorUserId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function downloadExportJob(
  jobId: string,
  userId: string,
): Promise<{ buffer: Buffer; fileName: string; contentType: string } | null> {
  const job = await AnalyticsExportJobModel.findOne({
    _id: jobId,
    actorUserId: userId,
    status: 'ready',
  });
  if (!job) return null;

  // Regenerate from stored filter/report so history downloads work even without stored blobs
  const data = await resolveExportData({
    reportType: job.reportType,
    format: job.format,
    filter: job.filter as AnalyticsFilter,
    scope: job.scope,
    columns: job.columns ?? undefined,
    drillLabel: job.drillLabel ?? undefined,
  });
  const buffer = await renderBuffer(data, job.format);
  return {
    buffer,
    fileName: job.fileName ?? fileNameFor(job.reportTitle, job.format),
    contentType: job.contentType ?? contentTypeFor(job.format),
  };
}

export { listExportReports, getExportReport };
