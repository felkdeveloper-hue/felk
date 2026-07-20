import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/store/ui-store';

const SIZE_CHART = [
  { size: 'S', chest: '36-38"', length: '27"', shoulder: '17"' },
  { size: 'M', chest: '38-40"', length: '28"', shoulder: '18"' },
  { size: 'L', chest: '40-42"', length: '29"', shoulder: '19"' },
  { size: 'XL', chest: '42-44"', length: '30"', shoulder: '20"' },
  { size: '2XL', chest: '44-46"', length: '31"', shoulder: '21"' },
];

export function SizeGuideModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const open = activeModal === 'size-guide';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Size Guide</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Measurements are in inches. For an oversized fit, choose your regular size.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-semibold">Size</th>
                <th className="py-2 text-left font-semibold">Chest</th>
                <th className="py-2 text-left font-semibold">Length</th>
                <th className="py-2 text-left font-semibold">Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.size} className="border-border/60 border-b">
                  <td className="py-2.5 font-medium">{row.size}</td>
                  <td className="text-muted-foreground py-2.5">{row.chest}</td>
                  <td className="text-muted-foreground py-2.5">{row.length}</td>
                  <td className="text-muted-foreground py-2.5">{row.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
