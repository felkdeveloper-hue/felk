import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  PRODUCT_IMPORT_BATCH_SIZE,
  productImportApi,
  type ImportPreview,
  type ImportProductInput,
  type ImportProductResult,
} from '@/services/sdk/admin';

interface BulkProductUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after products were created so the list can refresh. */
  onImported: () => void;
}

type Stage = 'select' | 'preview' | 'importing' | 'done';

function errorMessage(error: unknown, fallback: string) {
  return AppError.isAppError(error) ? error.message : fallback;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'good' }) {
  return (
    <div
      className={cn(
        'border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 py-2',
        tone === 'warn' && value > 0 && 'border-amber-300 bg-amber-50',
        tone === 'good' && value > 0 && 'border-emerald-300 bg-emerald-50',
      )}
    >
      <p className="text-lg font-bold leading-tight text-[var(--admin-ink)]">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-[var(--admin-ink-muted)]">{label}</p>
    </div>
  );
}

export function BulkProductUploadDialog({
  open,
  onOpenChange,
  onImported,
}: BulkProductUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [publish, setPublish] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportProductResult[]>([]);

  const groups = useMemo(() => {
    if (!preview) return { importable: [] as ImportProductInput[], blocked: [], duplicates: [] };
    const missingCategories = new Set(preview.newValues.categories);
    const duplicateSlugs = new Set(preview.duplicates);
    const importable: ImportProductInput[] = [];
    const blocked: ImportProductInput[] = [];
    const duplicates: ImportProductInput[] = [];
    for (const product of preview.products) {
      if (missingCategories.has(product.category)) blocked.push(product);
      else if (duplicateSlugs.has(product.slug)) duplicates.push(product);
      else importable.push(product);
    }
    return { importable, blocked, duplicates };
  }, [preview]);

  const reset = () => {
    setStage('select');
    setFile(null);
    setPreview(null);
    setPublish(false);
    setProgress({ done: 0, total: 0 });
    setResults([]);
  };

  const close = (next: boolean) => {
    if (stage === 'importing') return;
    if (!next) reset();
    onOpenChange(next);
  };

  const templateMutation = useMutation({
    mutationFn: () => productImportApi.downloadTemplate(),
    onError: (error) => toast.error(errorMessage(error, 'Could not download the template.')),
  });

  const previewMutation = useMutation({
    mutationFn: (selected: File) => productImportApi.preview(selected),
    onSuccess: (data) => {
      setPreview(data);
      setStage('preview');
    },
    onError: (error) => {
      setFile(null);
      toast.error(errorMessage(error, 'Could not read that file.'));
    },
  });

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    previewMutation.mutate(selected);
  };

  const runImport = async () => {
    const queue = groups.importable;
    if (!queue.length) return;

    setStage('importing');
    setProgress({ done: 0, total: queue.length });
    const collected: ImportProductResult[] = [];

    for (let index = 0; index < queue.length; index += PRODUCT_IMPORT_BATCH_SIZE) {
      const batch = queue.slice(index, index + PRODUCT_IMPORT_BATCH_SIZE);
      try {
        const response = await productImportApi.importBatch(batch, publish);
        collected.push(...response.results);
      } catch (error) {
        for (const product of batch) {
          collected.push({
            handle: product.handle,
            name: product.name,
            row: product.rows[0] ?? 0,
            status: 'failed',
            message: errorMessage(error, 'Upload failed.'),
          });
        }
      }
      setProgress({ done: Math.min(index + batch.length, queue.length), total: queue.length });
      setResults([...collected]);
    }

    setResults(collected);
    setStage('done');

    const created = collected.filter((result) => result.status === 'created').length;
    if (created) {
      toast.success(`${created} product${created === 1 ? '' : 's'} imported`);
      onImported();
    } else {
      toast.error('No products were imported. Check the report below.');
    }
  };

  const createdCount = results.filter((result) => result.status === 'created').length;
  const skippedCount = results.filter((result) => result.status === 'skipped').length;
  const failedCount = results.filter((result) => result.status === 'failed').length;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk upload products</DialogTitle>
          <DialogDescription>
            Fill one row per colour and size, then upload the sheet. Rows sharing a product name
            become one product with all its variants, prices and stock.
          </DialogDescription>
        </DialogHeader>

        {stage === 'select' ? (
          <div className="space-y-4 py-2">
            <ol className="space-y-2 text-sm text-[var(--admin-ink)]">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>
                  Download the template. It already lists your categories, colours and sizes on the
                  Reference sheet.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Fill the Products sheet in Excel and save it as .xlsx or .csv.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Upload it here. Nothing is created until you review and confirm.</span>
              </li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
                disabled={templateMutation.isPending}
                onClick={() => templateMutation.mutate()}
              >
                <Download className="h-4 w-4" />
                {templateMutation.isPending ? 'Preparing…' : 'Download Excel template'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary inline-flex items-center gap-2"
                disabled={previewMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {previewMutation.isPending ? 'Checking sheet…' : 'Choose file'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm,.csv"
                className="hidden"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            {file ? (
              <p className="flex items-center gap-2 text-xs text-[var(--admin-ink-muted)]">
                <FileSpreadsheet className="h-4 w-4" />
                {file.name}
              </p>
            ) : null}
          </div>
        ) : null}

        {stage === 'preview' && preview ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Products" value={preview.summary.products} />
              <Stat label="Variants" value={preview.summary.variants} />
              <Stat label="Stock units" value={preview.summary.stockUnits} />
              <Stat label="Rows with errors" value={preview.summary.issues} tone="warn" />
              <Stat label="Already exist" value={groups.duplicates.length} tone="warn" />
            </div>

            {preview.issues.length ? (
              <div className="border border-amber-300 bg-amber-50">
                <p className="flex items-center gap-2 border-b border-amber-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  {preview.issues.length} row{preview.issues.length === 1 ? '' : 's'} need fixing —
                  they will not be imported
                </p>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {preview.issues.slice(0, 100).map((issue, index) => (
                        <tr key={`${issue.row}-${index}`} className="border-b border-amber-100">
                          <td className="w-20 px-3 py-1.5 font-semibold text-amber-900">
                            Row {issue.row}
                          </td>
                          <td className="w-32 px-3 py-1.5 text-amber-800">{issue.column ?? ''}</td>
                          <td className="px-3 py-1.5 text-amber-900">{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {preview.newValues.colors.length ||
            preview.newValues.sizes.length ||
            preview.newValues.brands.length ? (
              <p className="text-xs text-[var(--admin-ink-muted)]">
                Will be created automatically:{' '}
                {[
                  preview.newValues.colors.length
                    ? `colours (${preview.newValues.colors.join(', ')})`
                    : '',
                  preview.newValues.sizes.length
                    ? `sizes (${preview.newValues.sizes.join(', ')})`
                    : '',
                  preview.newValues.brands.length
                    ? `brands (${preview.newValues.brands.join(', ')})`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}

            {groups.duplicates.length ? (
              <p className="text-xs text-[var(--admin-ink-muted)]">
                {groups.duplicates.length} product
                {groups.duplicates.length === 1 ? '' : 's'} already exist and will be skipped:{' '}
                {groups.duplicates
                  .slice(0, 5)
                  .map((product) => product.name)
                  .join(', ')}
                {groups.duplicates.length > 5 ? '…' : ''}
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-[var(--admin-ink)]">
              <input
                type="checkbox"
                checked={publish}
                onChange={(event) => setPublish(event.target.checked)}
                className="accent-[var(--admin-accent)]"
              />
              Publish immediately (otherwise they are created as drafts)
            </label>
          </div>
        ) : null}

        {stage === 'importing' ? (
          <div className="space-y-3 py-6">
            <p className="text-sm font-medium text-[var(--admin-ink)]">
              Importing {progress.done} of {progress.total} products…
            </p>
            <div className="h-2 w-full overflow-hidden bg-[var(--admin-line)]">
              <div
                className="h-full bg-[var(--admin-accent)] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-[var(--admin-ink-muted)]">
              Keep this window open until it finishes.
            </p>
          </div>
        ) : null}

        {stage === 'done' ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Created" value={createdCount} tone="good" />
              <Stat label="Skipped" value={skippedCount} />
              <Stat label="Failed" value={failedCount} tone="warn" />
            </div>

            {failedCount || skippedCount ? (
              <div className="max-h-56 overflow-y-auto border border-[var(--admin-line)]">
                <table className="w-full text-xs">
                  <tbody>
                    {results
                      .filter((result) => result.status !== 'created')
                      .map((result) => (
                        <tr
                          key={`${result.handle}-${result.row}`}
                          className="border-b border-[var(--admin-line)] last:border-0"
                        >
                          <td className="w-20 px-3 py-1.5 text-[var(--admin-ink-muted)]">
                            Row {result.row}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-[var(--admin-ink)]">
                            {result.name}
                          </td>
                          <td className="px-3 py-1.5 text-[var(--admin-ink-muted)]">
                            {result.message ?? result.status}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Everything imported cleanly.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          {stage === 'preview' ? (
            <>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={reset}>
                Choose another file
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={!groups.importable.length}
                onClick={() => void runImport()}
              >
                {groups.importable.length
                  ? `Import ${groups.importable.length} product${groups.importable.length === 1 ? '' : 's'}`
                  : 'Nothing to import'}
              </button>
            </>
          ) : null}

          {stage === 'select' ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => close(false)}
            >
              Cancel
            </button>
          ) : null}

          {stage === 'done' ? (
            <>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={reset}>
                Upload another sheet
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => close(false)}
              >
                Done
              </button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
