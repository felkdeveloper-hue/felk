import ExcelJS from 'exceljs';
import type { ExportColumn, ResolvedExportData } from './export.types.js';

function cellValue(col: ExportColumn, row: Record<string, unknown>): string | number | Date | null {
  const raw = col.format ? col.format(row[col.key], row) : row[col.key];
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

export async function generateExcel(
  data: ResolvedExportData,
  branding: { storeName: string },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = branding.storeName || 'Analytics';
  workbook.created = new Date();

  // Summary sheet first when KPIs exist or multiple sheets
  if (data.kpis.length || data.sheets.length > 1) {
    const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
    summary.addRow(['Report', data.report.title]);
    summary.addRow(['Generated', new Date().toISOString()]);
    if (data.drillLabel) summary.addRow(['Drill-down', data.drillLabel]);
    summary.addRow(['Period', data.filter.period ?? 'custom']);
    if (data.filter.from) summary.addRow(['From', data.filter.from]);
    if (data.filter.to) summary.addRow(['To', data.filter.to]);
    summary.addRow([]);
    summary.addRow(['KPI', 'Value']);
    for (const kpi of data.kpis) {
      summary.addRow([kpi.label, kpi.value]);
    }
    summary.addRow([]);
    summary.addRow(['Active Filters']);
    for (const [k, v] of Object.entries(data.filter)) {
      if (v !== undefined && v !== null && v !== '') summary.addRow([k, String(v)]);
    }
    summary.getColumn(1).width = 28;
    summary.getColumn(2).width = 40;
  }

  for (const sheet of data.sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    ws.addRow(sheet.columns.map((c) => c.header));
    const header = ws.getRow(1);
    header.font = { bold: true };
    header.commit();

    // Chunked row writes for large datasets
    const CHUNK = 500;
    for (let i = 0; i < sheet.rows.length; i += CHUNK) {
      const slice = sheet.rows.slice(i, i + CHUNK);
      for (const row of slice) {
        ws.addRow(sheet.columns.map((c) => cellValue(c, row)));
      }
    }

    sheet.columns.forEach((c, idx) => {
      ws.getColumn(idx + 1).width = Math.min(Math.max(c.header.length + 4, 14), 40);
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
