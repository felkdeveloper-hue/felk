import PDFDocument from 'pdfkit';
import type { ResolvedExportData } from './export.types.js';

export interface PdfBranding {
  storeName: string;
  logoUrl?: string | null;
}

function formatFilters(filter: Record<string, unknown>): string {
  return Object.entries(filter)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' · ');
}

export async function generatePdf(
  data: ResolvedExportData,
  branding: PdfBranding,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#111827';
    const muted = '#6b7280';

    doc
      .fillColor(primary)
      .fontSize(18)
      .text(branding.storeName || 'Analytics', { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(14).text(data.report.title);
    doc.fontSize(9).fillColor(muted).text(`Generated ${new Date().toLocaleString()}`);
    if (data.drillLabel) {
      doc.text(`Drill-down: ${data.drillLabel}`);
    }
    const filterLine = formatFilters(data.filter as Record<string, unknown>);
    if (filterLine) {
      doc.moveDown(0.2);
      doc.text(`Filters: ${filterLine}`, { width: 500 });
    }

    doc.moveDown(0.8);
    if (data.kpis.length) {
      doc.fillColor(primary).fontSize(12).text('KPI Summary');
      doc.moveDown(0.3);
      for (const kpi of data.kpis) {
        doc.fontSize(10).fillColor(muted).text(`${kpi.label}: `, { continued: true });
        doc.fillColor(primary).text(String(kpi.value));
      }
      doc.moveDown(0.6);
    }

    for (const sheet of data.sheets) {
      if (doc.y > 680) doc.addPage();
      doc.fillColor(primary).fontSize(12).text(sheet.name);
      doc.moveDown(0.3);

      const cols = sheet.columns.slice(0, 6);
      const colWidth = Math.floor(500 / Math.max(cols.length, 1));
      const startY = doc.y;

      doc.fontSize(8).fillColor(muted);
      cols.forEach((c, i) => {
        doc.text(c.header, 48 + i * colWidth, startY, {
          width: colWidth - 4,
          ellipsis: true,
        });
      });
      doc.moveDown(0.6);
      doc.strokeColor('#e5e7eb').moveTo(48, doc.y).lineTo(548, doc.y).stroke();

      const maxRows = Math.min(sheet.rows.length, 80);
      for (let r = 0; r < maxRows; r++) {
        if (doc.y > 720) {
          doc.addPage();
          doc.fontSize(8).fillColor(muted);
        }
        const row = sheet.rows[r]!;
        const y = doc.y + 4;
        doc.fillColor(primary);
        cols.forEach((c, i) => {
          const raw = c.format ? c.format(row[c.key], row) : row[c.key];
          const text =
            raw === null || raw === undefined
              ? ''
              : typeof raw === 'object'
                ? JSON.stringify(raw)
                : String(raw);
          doc.text(text.slice(0, 40), 48 + i * colWidth, y, {
            width: colWidth - 4,
            ellipsis: true,
          });
        });
        doc.y = y + 14;
      }

      if (sheet.rows.length > maxRows) {
        doc.moveDown(0.4);
        doc
          .fontSize(8)
          .fillColor(muted)
          .text(`… and ${sheet.rows.length - maxRows} more rows`);
      }
      doc.moveDown(0.8);
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(muted)
        .text(`${branding.storeName || 'Analytics'} · Page ${i + 1} of ${pages.count}`, 48, 780, {
          width: 500,
          align: 'center',
        });
    }

    doc.end();
  });
}
