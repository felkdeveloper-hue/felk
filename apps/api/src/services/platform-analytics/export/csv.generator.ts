import type { ExportColumn } from './export.types.js';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else if (typeof value === 'object') str = JSON.stringify(value);
  else str = String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function cellValue(col: ExportColumn, row: Record<string, unknown>): string {
  const raw = col.format ? col.format(row[col.key], row) : row[col.key];
  return escapeCsv(raw);
}

/** UTF-8 BOM for Excel compatibility + CSV body */
export function generateCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): Buffer {
  const header = columns.map((c) => escapeCsv(c.header)).join(',');
  const lines = [header];
  for (const row of rows) {
    lines.push(columns.map((c) => cellValue(c, row)).join(','));
  }
  const body = lines.join('\r\n');
  return Buffer.from(`\uFEFF${body}`, 'utf8');
}

/** Stream-friendly CSV chunk builder */
export function* csvRowChunks(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  chunkSize = 500,
): Generator<string> {
  yield `\uFEFF${columns.map((c) => escapeCsv(c.header)).join(',')}\r\n`;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    yield slice.map((row) => columns.map((c) => cellValue(c, row)).join(',')).join('\r\n') + '\r\n';
  }
}
