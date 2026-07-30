import { BarChart3 } from 'lucide-react';

export function AnalyticsEmpty({
  message = 'No data for the selected period.',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="text-muted-foreground/40 mb-3 h-10 w-10" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
