import { FeLogo, FE_LOGO_MINT } from '@/components/brand/fe-logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

/** Official FE size chart (inches) — Bust / Waist / Hips. */
const SIZE_CHART = [
  { size: 'S', bust: '33-35', waist: '25-27', hips: '35-37' },
  { size: 'M', bust: '35-37', waist: '27-29', hips: '37-39' },
  { size: 'L', bust: '38-40', waist: '30-32', hips: '40-42' },
  { size: 'XL', bust: '41-43', waist: '33-35', hips: '43-45' },
] as const;

export function SizeGuideModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const open = activeModal === 'size-guide';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent
        className={cn(
          'max-w-lg overflow-hidden rounded-3xl border border-[#E8DFD0]/80 bg-[#FAF7F2] p-0 text-[#1a1a1a] shadow-[0_24px_64px_-28px_rgba(0,0,0,0.35)]',
          '[&_button.absolute:hover]:bg-[#1a1a1a]/8 [&_button.absolute:hover]:text-[#1a1a1a] [&_button.absolute]:rounded-full [&_button.absolute]:text-[#1a1a1a]/60',
        )}
      >
        <div className="relative rounded-3xl px-6 pb-8 pt-7 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,rgba(193,240,246,0.35),transparent_55%)]"
          />

          <div className="relative flex items-start justify-between gap-4 pr-2">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="font-serif text-[2rem] font-normal tracking-tight text-[#1a1a1a] sm:text-[2.35rem]">
                Size Chart
              </DialogTitle>
            </DialogHeader>
            <FeLogo size={56} className="mr-3 mt-2 shrink-0" />
          </div>

          <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-[#E8DFD0] bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#000B29] shadow-sm">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: FE_LOGO_MINT }}
            />
            Size in inches
          </div>

          <div className="relative mt-5 overflow-hidden rounded-2xl border border-[#E8DFD0]/90 bg-white text-[#1a1a1a] shadow-[0_8px_32px_-16px_rgba(0,0,0,0.12)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE8E0] text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                  <th className="rounded-tl-2xl px-4 py-3.5 text-left font-semibold">Size</th>
                  <th className="px-3 py-3.5 text-left font-semibold">Bust</th>
                  <th className="px-3 py-3.5 text-left font-semibold">Waist</th>
                  <th className="rounded-tr-2xl px-4 py-3.5 text-left font-semibold">Hips</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((row, index) => (
                  <tr
                    key={row.size}
                    className={cn(
                      'border-b border-[#F0EBE3] last:border-0',
                      index % 2 === 1 && 'bg-[#FAF7F2]/60',
                      index === SIZE_CHART.length - 1 &&
                        '[&_td:first-child]:rounded-bl-2xl [&_td:last-child]:rounded-br-2xl',
                    )}
                  >
                    <td className="border-r border-[#F0EBE3] px-4 py-3.5 font-bold tracking-wide">
                      {row.size}
                    </td>
                    <td className="px-3 py-3.5 tabular-nums text-neutral-700">{row.bust}</td>
                    <td className="px-3 py-3.5 tabular-nums text-neutral-700">{row.waist}</td>
                    <td className="px-4 py-3.5 tabular-nums text-neutral-700">{row.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="relative mt-5 text-xs leading-relaxed tracking-wide text-neutral-500">
            Measurements are body measurements in inches. If you prefer a relaxed fit, consider
            sizing up.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
