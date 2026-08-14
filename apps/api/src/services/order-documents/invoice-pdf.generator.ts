import PDFDocument from 'pdfkit';
import type { OrderDocumentPayload } from './order-document.types.js';
import {
  formatCurrencyLkr,
  formatOrderDocumentAddress,
  formatPaymentMethodLabel,
} from './order-document.types.js';

const NAVY = '#000B26';
const MUTED = '#9CA3AF';
const INK = '#111111';
const ADDR = '#6B7280';
const LINE = '#E5E7EB';
const SETTLEMENT_BG = '#F3F4F6';
const FOOTER = '#C4C4C4';

function formatRegistryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPlainAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function generateInvoicePdf(payload: OrderDocumentPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 54,
      size: 'A4',
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = left + pageWidth;

    // Header — site wordmark FE (not the sample teal badge)
    const headerY = doc.y;
    doc.font('Helvetica-Bold').fontSize(28).fillColor(INK).text('FE', left, headerY, {
      lineBreak: false,
    });

    const brandX = left + 52;
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(INK)
      .text(payload.branding.storeName, brandX, headerY + 2);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(payload.branding.storeAddress.toUpperCase(), brandX, headerY + 22, {
        characterSpacing: 0.8,
      });

    const badgeWidth = 186;
    const badgeHeight = 22;
    const badgeX = right - badgeWidth;
    doc.roundedRect(badgeX, headerY + 4, badgeWidth, badgeHeight, 11).fill(NAVY);
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#fff')
      .text('OFFICIAL ORDER MANIFEST', badgeX, headerY + 11, {
        width: badgeWidth,
        align: 'center',
        characterSpacing: 1,
      });

    // Registry
    const registryY = headerY + 62;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('INVOICE REGISTRY', left, registryY, {
      characterSpacing: 1.1,
    });
    doc.text('REGISTRY DATE', left, registryY, {
      width: pageWidth,
      align: 'right',
      characterSpacing: 1.1,
    });
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(INK)
      .text(payload.orderNumber, left, registryY + 12);
    doc.fontSize(12).text(formatRegistryDate(payload.issuedAt), left, registryY + 14, {
      width: pageWidth,
      align: 'right',
    });

    const ruleY = registryY + 38;
    doc.moveTo(left, ruleY).lineTo(right, ruleY).strokeColor(INK).lineWidth(1.2).stroke();

    // Recipient + payment
    const sectionY = ruleY + 18;
    const columnGap = 28;
    const columnWidth = (pageWidth - columnGap) / 2;
    const paymentX = left + columnWidth + columnGap;

    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('RECIPIENT', left, sectionY, {
      characterSpacing: 1.1,
    });
    doc.text('PAYMENT DETAILS', paymentX, sectionY, { characterSpacing: 1.1 });

    const recipientName = payload.recipient.fullName ?? 'Customer';
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(INK)
      .text(recipientName, left, sectionY + 14, {
        width: columnWidth,
      });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(ADDR)
      .text(formatOrderDocumentAddress(payload.recipient), left, doc.y + 3, {
        width: columnWidth,
        lineGap: 2,
      });
    if (payload.recipient.phone) {
      doc.text(payload.recipient.phone, left, doc.y + 2, { width: columnWidth });
    }

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(MUTED)
      .text('METHOD: ', paymentX, sectionY + 14, {
        continued: true,
      });
    doc.fillColor(INK).font('Helvetica-Bold').text(formatPaymentMethodLabel(payload.paymentMethod));
    doc
      .font('Helvetica')
      .fillColor(MUTED)
      .text('STATUS: ', paymentX, sectionY + 32, {
        continued: true,
      });
    doc.fillColor(INK).font('Helvetica-Bold').text(payload.paymentStatus.toUpperCase());

    // Items table
    const tableTop = Math.max(doc.y, sectionY + 86) + 18;
    const qtyX = left + pageWidth * 0.68;
    const amountX = left + pageWidth * 0.8;
    const qtyW = pageWidth * 0.12;
    const amountW = pageWidth * 0.2;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK);
    doc.text('ARTICLE DESCRIPTION', left, tableTop, { characterSpacing: 0.7 });
    doc.text('QTY', qtyX, tableTop, { width: qtyW, align: 'center', characterSpacing: 0.7 });
    doc.text('AMOUNT', amountX, tableTop, {
      width: amountW,
      align: 'right',
      characterSpacing: 0.7,
    });
    doc
      .moveTo(left, tableTop + 16)
      .lineTo(right, tableTop + 16)
      .strokeColor(INK)
      .lineWidth(0.9)
      .stroke();

    let rowY = tableTop + 24;
    for (const item of payload.items) {
      if (rowY > doc.page.height - 170) {
        doc.addPage();
        rowY = doc.page.margins.top;
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(item.name.toUpperCase(), left, rowY, { width: pageWidth * 0.64 });
      const nameBottom = doc.y;
      const variant = item.variantTitle?.trim();
      if (variant) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(MUTED)
          .text(variant.toUpperCase(), left, nameBottom + 2, { width: pageWidth * 0.64 });
      }
      const rowBottom = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(String(item.quantity), qtyX, rowY, { width: qtyW, align: 'center' });
      doc.text(formatCurrencyLkr(item.lineTotal, payload.currency), amountX, rowY, {
        width: amountW,
        align: 'right',
      });

      rowY = rowBottom + 12;
      doc.moveTo(left, rowY).lineTo(right, rowY).strokeColor(LINE).lineWidth(0.7).stroke();
      rowY += 10;
    }

    // Settlement box
    const boxWidth = 228;
    const extraRows = payload.totals.discount > 0 ? 16 : 0;
    const boxHeight = 88 + extraRows;
    const boxX = right - boxWidth;
    let boxY = rowY + 10;
    if (boxY + boxHeight > doc.page.height - 48) {
      doc.addPage();
      boxY = doc.page.margins.top;
    }

    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 12).fill(SETTLEMENT_BG);

    const moneyRow = (label: string, value: string, y: number) => {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(label, boxX + 16, y, {
          characterSpacing: 0.6,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(value, boxX + 16, y, {
          width: boxWidth - 32,
          align: 'right',
        });
    };

    moneyRow('SUBTOTAL', formatPlainAmount(payload.totals.subtotal), boxY + 14);
    moneyRow('LOGISTICS', formatPlainAmount(payload.totals.shipping), boxY + 32);
    let dividerY = boxY + 50;
    if (payload.totals.discount > 0) {
      moneyRow('DISCOUNT', `−${formatPlainAmount(payload.totals.discount)}`, boxY + 50);
      dividerY = boxY + 66;
    }
    doc
      .moveTo(boxX + 16, dividerY)
      .lineTo(boxX + boxWidth - 16, dividerY)
      .strokeColor(NAVY)
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(NAVY)
      .text('SETTLEMENT', boxX + 16, dividerY + 12, { characterSpacing: 0.6 });
    doc
      .fontSize(13)
      .text(
        formatCurrencyLkr(payload.totals.grandTotal, payload.currency),
        boxX + 16,
        dividerY + 10,
        {
          width: boxWidth - 32,
          align: 'right',
        },
      );

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(FOOTER)
      .text(
        `${payload.branding.storeName} • ${payload.branding.storeTagline}`,
        left,
        doc.page.height - 36,
        { width: pageWidth, align: 'center', characterSpacing: 1 },
      );

    doc.end();
  });
}
