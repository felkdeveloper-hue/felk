import type PDFDocument from 'pdfkit';

/** Original Fashion Edge mark — mint circle, navy "fe." */
export const FE_LOGO_MINT = '#C1F0F6';
export const FE_LOGO_NAVY = '#000B29';

/** Draw the circular fe. mark at (x, y) with the given diameter. */
export function drawFeLogo(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  size: number,
): void {
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;

  doc.circle(cx, cy, radius).fill(FE_LOGO_MINT);

  const fontSize = size * 0.42;
  doc
    .font('Helvetica-Bold')
    .fontSize(fontSize)
    .fillColor(FE_LOGO_NAVY)
    .text('fe.', x, cy - fontSize * 0.38, {
      width: size,
      align: 'center',
      lineBreak: false,
    });
}
