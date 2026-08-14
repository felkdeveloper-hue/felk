import PDFDocument from 'pdfkit';
import type { OrderDocumentPayload } from './order-document.types.js';
import { formatOrderDocumentAddress } from './order-document.types.js';

const LIGHT_BLUE = '#D1FAE5';

export async function generateShippingLabelPdf(payload: OrderDocumentPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [432, 288],
      margins: { top: 14, bottom: 14, left: 14, right: 14 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const top = doc.page.margins.top;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const height = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

    doc.rect(left, top, width, height).strokeColor('#111').lineWidth(1.5).stroke();

    const headerHeight = 88;
    const logoSize = 56;
    const logoX = left + 12;
    const logoY = top + 16;

    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).fill(LIGHT_BLUE);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#111')
      .text('fe.', logoX + 14, logoY + 18);

    const toX = logoX + logoSize + 18;
    const dividerX = toX - 10;
    doc
      .moveTo(dividerX, top + 10)
      .lineTo(dividerX, top + headerHeight - 8)
      .strokeColor('#111')
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#111')
      .text('TO:', toX, top + 16);
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text((payload.recipient.fullName ?? 'Customer').toUpperCase(), toX, top + 30, {
        width: left + width - toX - 12,
      });
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(formatOrderDocumentAddress(payload.recipient), toX, doc.y + 4, {
        width: left + width - toX - 12,
        lineGap: 1,
      });

    const bandY = top + headerHeight;
    doc.rect(left, bandY, width, 28).fill('#111');
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#fff')
      .text('P R I O R I T Y   M A I L', left, bandY + 8, {
        width,
        align: 'center',
        characterSpacing: 2.5,
      });

    const fromY = bandY + 36;
    doc
      .moveTo(left, fromY - 6)
      .lineTo(left + width, fromY - 6)
      .strokeColor('#111')
      .lineWidth(0.8)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#111')
      .text('FROM: FASHION EDGE', left + 12, fromY);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`${payload.branding.storeAddress}, Sri Lanka`, left + 12, doc.y + 3);

    const footerY = top + height - 62;
    doc
      .moveTo(left, footerY - 8)
      .lineTo(left + width, footerY - 8)
      .strokeColor('#111')
      .lineWidth(0.8)
      .stroke();

    const footerMid = left + width * 0.58;
    doc
      .moveTo(footerMid, footerY - 8)
      .lineTo(footerMid, top + height - 8)
      .strokeColor('#111')
      .lineWidth(0.8)
      .stroke();

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111');
    doc.text(`ORDER NR: ${payload.orderNumber}`, left + 12, footerY);
    const weightKg =
      payload.totals.totalWeightGrams && payload.totals.totalWeightGrams > 0
        ? `${(payload.totals.totalWeightGrams / 1000).toFixed(2)} kg`
        : '—';
    doc.font('Helvetica').text(`WEIGHT: ${weightKg}`, left + 12, doc.y + 4);
    doc.text(`SHIP DATE: ${payload.issuedAt.toLocaleDateString('en-GB')}`, left + 12, doc.y + 4);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('CONTACT NUMBER:', footerMid + 12, footerY);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(payload.recipient.phone ?? '—', footerMid + 12, footerY + 14, {
        width: left + width - footerMid - 20,
      });

    doc.end();
  });
}
