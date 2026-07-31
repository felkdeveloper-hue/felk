import { useCallback, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ADMIN_ROUTES } from '@/constants';
import {
  adminAnalyticsApi,
  type AnalyticsExportFormat,
  type AnalyticsExportScope,
  type AnalyticsFilter,
} from '@/services/sdk/admin';
import { AppError } from '@/lib/errors';

export interface AnalyticsExportButtonProps {
  reportType: string;
  filter: AnalyticsFilter;
  /** Default export scope */
  scope?: AnalyticsExportScope;
  /** Show Current page / All results toggle (for paginated datasets) */
  allowPageScope?: boolean;
  columns?: string[];
  drillLabel?: string;
  className?: string;
}

const FORMATS: Array<{
  format: AnalyticsExportFormat;
  label: string;
  hint: string;
  icon: typeof FileText;
}> = [
  { format: 'csv', label: 'CSV', hint: 'Raw data · Excel compatible', icon: FileText },
  { format: 'xlsx', label: 'Excel', hint: 'Multi-sheet workbook', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', hint: 'Formatted report', icon: FileText },
];

export function AnalyticsExportButton({
  reportType,
  filter,
  scope: scopeProp = 'all',
  allowPageScope = false,
  columns,
  drillLabel,
  className,
}: AnalyticsExportButtonProps) {
  const [busyFormat, setBusyFormat] = useState<AnalyticsExportFormat | null>(null);
  const [scope, setScope] = useState<AnalyticsExportScope>(scopeProp);

  const runExport = useCallback(
    async (format: AnalyticsExportFormat) => {
      setBusyFormat(format);
      const toastId = toast.loading('Preparing report…');
      try {
        const result = await adminAnalyticsApi.createExport({
          reportType,
          format,
          filter,
          scope,
          columns,
          drillLabel,
        });

        if (result.async && result.jobId) {
          toast.loading('Large export queued — working in background…', { id: toastId });
          const ready = await adminAnalyticsApi.waitForExport(result.jobId, {
            onProgress: (job) => {
              toast.loading(`Export ${job.status}…`, { id: toastId });
            },
          });
          if (ready.status === 'failed') {
            throw new Error(ready.error || 'Export failed');
          }
          await adminAnalyticsApi.downloadExport(ready.id);
          toast.success('Report ready — download started', {
            id: toastId,
            action: {
              label: 'History',
              onClick: () => {
                window.location.href = ADMIN_ROUTES.analyticsExports;
              },
            },
          });
          return;
        }

        toast.success('Report downloaded', { id: toastId });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unable to export report';
        toast.error(message, { id: toastId });
      } finally {
        setBusyFormat(null);
      }
    },
    [columns, drillLabel, filter, reportType, scope],
  );

  const busy = busyFormat !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={
            className ??
            'admin-btn admin-btn-secondary inline-flex items-center gap-2 disabled:opacity-60'
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? 'Preparing…' : 'Export'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map(({ format, label, hint, icon: Icon }) => (
          <DropdownMenuItem
            key={format}
            disabled={busy}
            onSelect={() => void runExport(format)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <Icon className="h-3.5 w-3.5" />
              {label}
              {busyFormat === format ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : null}
            </span>
            <span className="text-muted-foreground text-xs">{hint}</span>
          </DropdownMenuItem>
        ))}
        {allowPageScope ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Rows</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as AnalyticsExportScope)}
            >
              <DropdownMenuRadioItem value="all">All results</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="page">Current page</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to={ADMIN_ROUTES.analyticsExports as never}
            className="text-muted-foreground text-xs"
          >
            View export history
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
