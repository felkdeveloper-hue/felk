import PDFDocument from 'pdfkit';
import type { OrderDocumentPayload } from './order-document.types.js';
import {
  formatCurrencyLkr,
  formatOrderDocumentAddress,
  formatPaymentMethodLabel,
} from './order-document.types.js';

const NAVY = '#000B26';
const MUTED = '#9CA3AF';
const LIGHT_BLUE = '#D1FAE5';
const SETTLEMENT_BG = '#EEF2FF';

function formatRegistryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function generateInvoicePdf(payload: OrderDocumentPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // Header
    doc.roundedRect(left, doc.y, 42, 42, 8).fill(LIGHT_BLUE);
    doc
      .fillColor('#111')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('fe.', left + 10, doc.y - 34);

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#111')
      .text(payload.branding.storeName, left + 54, doc.y - 42);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(payload.branding.storeAddress.toUpperCase(), left + 54, doc.y - 22, {
        characterSpacing: 0.6,
      });

    const badgeWidth = 190;
    const badgeX = left + pageWidth - badgeWidth;
    doc.roundedRect(badgeX, doc.y - 42, badgeWidth, 28, 6).fill(NAVY);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#fff')
      .text('OFFICIAL ORDER MANIFEST', badgeX, doc.y - 32, {
        width: badgeWidth,
        align: 'center',
        characterSpacing: 0.8,
      });

    doc.moveDown(2.2);

    // Registry row
    const registryY = doc.y;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('INVOICE REGISTRY', left, registryY, {
      characterSpacing: 0.8,
    });
    doc.text('REGISTRY DATE', left, registryY, {
      width: pageWidth,
      align: 'right',
      characterSpacing: 0.8,
    });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#111')
      .text(payload.orderNumber, left, registryY + 14);
    doc.text(formatRegistryDate(payload.issuedAt), left, registryY + 14, {
      width: pageWidth,
      align: 'right',
    });

    doc
      .moveTo(left, registryY + 36)
      .lineTo(left + pageWidth, registryY + 36)
      .strokeColor('#111')
      .lineWidth(1.2)
      .stroke();

    doc.y = registryY + 48;

    // Recipient + payment
    const columnGap = 24;
    const columnWidth = (pageWidth - columnGap) / 2;
    const sectionY = doc.y;

    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('RECIPIENT', left, sectionY, {
      characterSpacing: 0.8,
    });
    doc.text('PAYMENT DETAILS', left + columnWidth + columnGap, sectionY, {
      characterSpacing: 0.8,
    });

    const recipientName = payload.recipient.fullName ?? 'Customer';
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111')
      .text(recipientName, left, sectionY + 14, { width: columnWidth });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#333')
      .text(formatOrderDocumentAddress(payload.recipient), left, doc.y + 4, {
        width: columnWidth,
        lineGap: 2,
      });
    if (payload.recipient.phone) {
      doc.text(payload.recipient.phone, left, doc.y + 2, { width: columnWidth });
    }

    const paymentX = left + columnWidth + columnGap;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('METHOD: ', paymentX, sectionY + 14, { continued: true });
    doc
      .fillColor('#111')
      .font('Helvetica-Bold')
      .text(formatPaymentMethodLabel(payload.paymentMethod));
    doc
      .font('Helvetica')
      .fillColor(MUTED)
      .text('STATUS: ', paymentX, doc.y + 6, { continued: true });
    doc.fillColor('#111').font('Helvetica-Bold').text(payload.paymentStatus.toUpperCase());

    doc.moveDown(2.5);

    // Items table header
    const tableTop = doc.y;
    doc.rect(left, tableTop, pageWidth, 22).fill('#F3F4F6');
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#111')
      .text('ARTICLE DESCRIPTION', left + 10, tableTop + 7, { characterSpacing: 0.6 });
    doc.text('QTY', left + pageWidth * 0.72, tableTop + 7, {
      width: pageWidth * 0.1,
      align: 'center',
      characterSpacing: 0.6,
    });
    doc.text('AMOUNT', left + pageWidth * 0.82, tableTop + 7, {
      width: pageWidth * 0.16,
      align: 'right',
      characterSpacing: 0.6,
    });

    let rowY = tableTop + 28;
    for (const item of payload.items) {
      if (rowY > doc.page.height - 160) {
        doc.addPage();
        rowY = doc.page.margins.top;
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#111')
        .text(item.name.toUpperCase(), left + 10, rowY, { width: pageWidth * 0.62 });
      const variant = item.variantTitle?.trim();
      if (variant) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(MUTED)
          .text(variant.toUpperCase(), left + 10, doc.y + 2, { width: pageWidth * 0.62 });
      }
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#111')
        .text(String(item.quantity), left + pageWidth * 0.72, rowY, {
          width: pageWidth * 0.1,
          align: 'center',
        });
      doc.text(formatCurrencyLkr(item.lineTotal, payload.currency), left + pageWidth * 0.82, rowY, {
        width: pageWidth * 0.16,
        align: 'right',
      });

      rowY = doc.y + 14;
      doc
        .moveTo(left, rowY - 6)
        .lineTo(left + pageWidth, rowY - 6)
        .strokeColor('#E5E7EB')
        .lineWidth(0.8)
        .stroke();
    }

    // Settlement box
    const boxWidth = 230;
    const boxX = left + pageWidth - boxWidth;
    const boxY = Math.max(rowY + 16, doc.page.height - doc.page.margins.bottom - 130);

    doc.roundedRect(boxX, boxY, boxWidth, 96, 10).fill(SETTLEMENT_BG);

    const row = (label: string, value: string, y: number, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 11 : 9)
        .fillColor(bold ? '#111' : MUTED)
        .text(label, boxX + 14, y);
      doc.fillColor('#111').text(value, boxX + 14, y, { width: boxWidth - 28, align: 'right' });
    };

    row('SUBTOTAL', formatCurrencyLkr(payload.totals.subtotal, payload.currency), boxY + 14);
    row('LOGISTICS', formatCurrencyLkr(payload.totals.shipping, payload.currency), boxY + 32);
    doc
      .moveTo(boxX + 14, boxY + 52)
      .lineTo(boxX + boxWidth - 14, boxY + 52)
      .strokeColor(NAVY)
      .lineWidth(1.2)
      .stroke();
    row(
      'SETTLEMENT',
      formatCurrencyLkr(payload.totals.grandTotal, payload.currency),
      boxY + 62,
      true,
    );
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(formatCurrencyLkr(payload.totals.grandTotal, payload.currency), boxX + 14, boxY + 74, {
        width: boxWidth - 28,
        align: 'right',
      });

    // Footer
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${payload.branding.storeName} • ${payload.branding.storeTagline}`,
        left,
        doc.page.height - doc.page.margins.bottom - 18,
        { width: pageWidth, align: 'center', characterSpacing: 0.8 },
      );

    doc.end();
  });
}
