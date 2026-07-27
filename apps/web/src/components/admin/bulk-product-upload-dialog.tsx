import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from 'lucide-react';
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
  onImported: () => void;
}

type Stage = 'select' | 'preview' | 'importing' | 'done';

function errorMessage(error: unknown, fallback: string) {
  return AppError.isAppError(error) ? error.message : fallback;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'warn' | 'good' | 'neutral';
}) {
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

/** Editable row in the preview table. */
function EditableCell({
  value,
  onChange,
  type = 'text',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs focus:border-[var(--admin-accent)] focus:bg-white focus:outline-none',
        className,
      )}
    />
  );
}

export function BulkProductUploadDialog({
  open,
  onOpenChange,
  onImported,
}: BulkProductUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [imagesSessionId, setImagesSessionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  // Editable local copy of products
  const [editedProducts, setEditedProducts] = useState<ImportProductInput[]>([]);
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
    for (const product of editedProducts) {
      if (missingCategories.has(product.category)) blocked.push(product);
      else if (duplicateSlugs.has(product.slug)) duplicates.push(product);
      else importable.push(product);
    }
    return { importable, blocked, duplicates };
  }, [preview, editedProducts]);

  const reset = () => {
    setStage('select');
    setFile(null);
    setImagesZip(null);
    setImagesSessionId(null);
    setPreview(null);
    setEditedProducts([]);
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
    onError: (error) => toast.error(errorMessage(error, 'Could not download the Excel template.')),
  });

  const csvTemplateMutation = useMutation({
    mutationFn: () => productImportApi.downloadTemplateCsv(),
    onError: (error) => toast.error(errorMessage(error, 'Could not download the CSV template.')),
  });

  const sampleZipMutation = useMutation({
    mutationFn: () => productImportApi.downloadSampleImagesZip(),
    onError: (error) =>
      toast.error(errorMessage(error, 'Could not download the sample images ZIP.')),
  });

  const previewMutation = useMutation({
    mutationFn: ({ sheet, zip }: { sheet: File; zip: File | null }) =>
      productImportApi.preview(sheet, zip),
    onSuccess: (data) => {
      setPreview(data);
      setEditedProducts(data.products);
      setImagesSessionId(data.imagesSessionId ?? null);
      setStage('preview');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not read that file.'));
    },
  });

  const runPreview = () => {
    if (!file) {
      toast.error('Choose an Excel or CSV file first.');
      return;
    }
    previewMutation.mutate({ sheet: file, zip: imagesZip });
  };

  /** Update a field in the editable preview. */
  const updateProduct = (index: number, field: keyof ImportProductInput, value: string) => {
    setEditedProducts((prev) => {
      const next = [...prev];
      const product = { ...next[index]! };
      if (
        field === 'status' ||
        field === 'visibility' ||
        field === 'category' ||
        field === 'name'
      ) {
        (product as Record<string, unknown>)[field] = value;
      }
      next[index] = product;
      return next;
    });
  };

  const updateVariantPrice = (productIndex: number, variantIndex: number, value: string) => {
    setEditedProducts((prev) => {
      const next = [...prev];
      const product = { ...next[productIndex]! };
      const variants = [...product.variants];
      const variant = { ...variants[variantIndex]! };
      variant.price = parseFloat(value) || variant.price;
      variants[variantIndex] = variant;
      product.variants = variants;
      next[productIndex] = product;
      return next;
    });
  };

  const updateVariantStock = (productIndex: number, variantIndex: number, value: string) => {
    setEditedProducts((prev) => {
      const next = [...prev];
      const product = { ...next[productIndex]! };
      const variants = [...product.variants];
      const variant = { ...variants[variantIndex]! };
      variant.stock = parseInt(value, 10) || 0;
      variants[variantIndex] = variant;
      product.variants = variants;
      next[productIndex] = product;
      return next;
    });
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
        const response = await productImportApi.importBatch(batch, publish, {
          imagesSessionId,
          // Without a preview session, re-send ZIP each batch so filename refs still resolve
          imagesZip: imagesSessionId ? null : imagesZip,
        });
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

    const created = collected.filter((r) => r.status === 'created').length;
    if (created) {
      toast.success(`${created} product${created === 1 ? '' : 's'} imported`);
      onImported();
    } else {
      toast.error('No products were imported. Check the error report below.');
    }
  };

  const createdCount = results.filter((r) => r.status === 'created').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk upload products</DialogTitle>
          <DialogDescription>
            Download the template, fill your catalogue, optionally attach an images ZIP, then
            preview before importing. Nothing is created until you click Import.
          </DialogDescription>
        </DialogHeader>

        {/* ── Stage: Select ───────────────────────────────────────────────── */}
        {stage === 'select' ? (
          <div className="space-y-5 py-2">
            <ol className="space-y-2 text-sm text-[var(--admin-ink)]">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Download Template</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>
                  Fill Excel — same Product Name on multiple rows = one product with those
                  colour/size variants. Leave Images blank on same-color rows to reuse earlier
                  images.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>
                  (Optional) Upload ZIP containing all product images. The image names inside the
                  ZIP should match the names used in the Excel.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Preview</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                <span>Import</span>
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
                {templateMutation.isPending ? 'Preparing…' : 'Download Sample Excel'}
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
                disabled={csvTemplateMutation.isPending}
                onClick={() => csvTemplateMutation.mutate()}
              >
                <FileText className="h-4 w-4" />
                {csvTemplateMutation.isPending ? 'Preparing…' : 'Download CSV'}
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
                disabled={sampleZipMutation.isPending}
                onClick={() => sampleZipMutation.mutate()}
              >
                <FileArchive className="h-4 w-4" />
                {sampleZipMutation.isPending ? 'Preparing…' : 'Download Sample ZIP'}
              </button>
            </div>

            <div className="space-y-3 border border-[var(--admin-line)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary inline-flex items-center gap-2"
                  disabled={previewMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose Excel / CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xlsm,.csv"
                  className="hidden"
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    if (selected) setFile(selected);
                    event.target.value = '';
                  }}
                />
                {file ? (
                  <span className="inline-flex items-center gap-2 text-xs text-[var(--admin-ink)]">
                    <FileSpreadsheet className="h-4 w-4" />
                    {file.name}
                    <button
                      type="button"
                      className="text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
                      aria-label="Remove spreadsheet"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-[var(--admin-ink-muted)]">Required</span>
                )}
              </div>

              <div className="border-t border-[var(--admin-line)] pt-3">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  Product Images (Optional)
                </p>
                <p className="mt-1 text-xs text-[var(--admin-ink-muted)]">
                  Upload a ZIP containing all product images. Supported: .zip
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--admin-ink-muted)]">
                  Example:
                  <br />
                  shirt-black-front.jpg
                  <br />
                  shirt-black-back.jpg
                  <br />
                  shirt-white-front.jpg
                  <br />
                  hoodie-1.jpg
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
                    disabled={previewMutation.isPending}
                    onClick={() => zipInputRef.current?.click()}
                  >
                    <FileArchive className="h-4 w-4" />
                    Choose ZIP
                  </button>
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) return;
                      if (!/\.zip$/i.test(selected.name)) {
                        toast.error('Only .zip files are supported for product images.');
                        event.target.value = '';
                        return;
                      }
                      setImagesZip(selected);
                      event.target.value = '';
                    }}
                  />
                  {imagesZip ? (
                    <span className="inline-flex items-center gap-2 text-xs text-[var(--admin-ink)]">
                      <FileArchive className="h-4 w-4" />
                      {imagesZip.name}
                      <button
                        type="button"
                        className="text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
                        aria-label="Remove images ZIP"
                        onClick={() => setImagesZip(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-primary inline-flex items-center gap-2"
              disabled={!file || previewMutation.isPending}
              onClick={runPreview}
            >
              <Upload className="h-4 w-4" />
              {previewMutation.isPending ? 'Checking files…' : 'Preview'}
            </button>
          </div>
        ) : null}

        {/* ── Stage: Preview ──────────────────────────────────────────────── */}
        {stage === 'preview' && preview ? (
          <div className="space-y-4 py-2">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <Stat label="Products" value={preview.summary.products} />
              <Stat label="Variants" value={preview.summary.variants} />
              <Stat label="Stock units" value={preview.summary.stockUnits} />
              <Stat label="Images" value={preview.summary.images} />
              <Stat label="Row errors" value={preview.summary.issues} tone="warn" />
              <Stat label="Already exist" value={groups.duplicates.length} tone="warn" />
              <Stat label="Will import" value={groups.importable.length} tone="good" />
            </div>

            {preview.zipSummary ? (
              <p className="text-xs text-[var(--admin-ink-muted)]">
                Images ZIP ready: {preview.zipSummary.imageCount} image
                {preview.zipSummary.imageCount === 1 ? '' : 's'} extracted for this import session.
              </p>
            ) : null}

            {/* Validation issues */}
            {preview.issues.length > 0 ? (
              <div className="border border-amber-300 bg-amber-50">
                <p className="flex items-center gap-2 border-b border-amber-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  {preview.issues.length} row{preview.issues.length === 1 ? '' : 's'} with errors —
                  these rows will not be imported
                </p>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {preview.issues.slice(0, 100).map((issue, i) => (
                        <tr key={`${issue.row}-${i}`} className="border-b border-amber-100">
                          <td className="w-16 px-3 py-1.5 font-semibold text-amber-900">
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

            {/* Auto-create notices */}
            {preview.newValues.colors.length ||
            preview.newValues.sizes.length ||
            preview.newValues.brands.length ? (
              <p className="text-xs text-[var(--admin-ink-muted)]">
                Will be created automatically:{' '}
                {[
                  preview.newValues.colors.length
                    ? `colors (${preview.newValues.colors.join(', ')})`
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

            {/* Duplicates notice */}
            {groups.duplicates.length > 0 ? (
              <p className="text-xs text-[var(--admin-ink-muted)]">
                {groups.duplicates.length} product{groups.duplicates.length === 1 ? '' : 's'}{' '}
                already exist and will be skipped:{' '}
                {groups.duplicates
                  .slice(0, 5)
                  .map((p) => p.name)
                  .join(', ')}
                {groups.duplicates.length > 5 ? '…' : ''}
              </p>
            ) : null}

            {/* Editable product table */}
            {groups.importable.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                  Preview — click cells to edit before importing
                </p>
                <div className="max-h-64 overflow-auto border border-[var(--admin-line)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--admin-panel)]">
                      <tr className="border-b border-[var(--admin-line)]">
                        <th className="px-2 py-2 text-left text-[var(--admin-ink-muted)]">
                          Product
                        </th>
                        <th className="px-2 py-2 text-left text-[var(--admin-ink-muted)]">
                          Category
                        </th>
                        <th className="px-2 py-2 text-left text-[var(--admin-ink-muted)]">
                          Status
                        </th>
                        <th className="px-2 py-2 text-right text-[var(--admin-ink-muted)]">
                          Variants
                        </th>
                        <th className="px-2 py-2 text-right text-[var(--admin-ink-muted)]">
                          Stock
                        </th>
                        <th className="px-2 py-2 text-right text-[var(--admin-ink-muted)]">
                          Min Price
                        </th>
                        <th className="w-6 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {editedProducts.map((product, pIdx) => {
                        const isBlocked = preview.newValues.categories.includes(product.category);
                        const isDupe = preview.duplicates.includes(product.slug);
                        const totalStock = product.variants.reduce(
                          (sum, v) => sum + (v.stock ?? 0),
                          0,
                        );
                        const minPrice = Math.min(...product.variants.map((v) => v.price));
                        return (
                          <tr
                            key={product.handle}
                            className={cn(
                              'border-b border-[var(--admin-line)] last:border-0',
                              isBlocked && 'bg-red-50 opacity-60',
                              isDupe && 'bg-amber-50 opacity-70',
                            )}
                          >
                            <td className="px-2 py-1.5">
                              <EditableCell
                                value={product.name}
                                onChange={(v) => updateProduct(pIdx, 'name', v)}
                              />
                              {(isBlocked || isDupe) && (
                                <span className="ml-1 text-[10px] text-red-600">
                                  {isBlocked ? 'missing category' : 'duplicate'}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <EditableCell
                                value={product.category}
                                onChange={(v) => updateProduct(pIdx, 'category', v)}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={product.status}
                                onChange={(e) => updateProduct(pIdx, 'status', e.target.value)}
                                className="w-full rounded border border-transparent bg-transparent text-xs focus:border-[var(--admin-accent)] focus:bg-white focus:outline-none"
                              >
                                <option value="draft">draft</option>
                                <option value="active">active</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-right text-[var(--admin-ink-muted)]">
                              {product.variants.length}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <EditableCell
                                value={String(totalStock)}
                                type="number"
                                className="text-right"
                                onChange={(v) => {
                                  const newStock = parseInt(v, 10) || 0;
                                  product.variants.forEach((_, vIdx) =>
                                    updateVariantStock(pIdx, vIdx, String(newStock)),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <EditableCell
                                value={String(minPrice)}
                                type="number"
                                className="text-right"
                                onChange={(v) =>
                                  product.variants.forEach((_, vIdx) =>
                                    updateVariantPrice(pIdx, vIdx, v),
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                title="Remove from import"
                                onClick={() =>
                                  setEditedProducts((prev) => prev.filter((_, i) => i !== pIdx))
                                }
                                className="text-[var(--admin-ink-muted)] hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {groups.blocked.length > 0 ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {groups.blocked.length} product{groups.blocked.length === 1 ? '' : 's'} blocked
                because their category does not exist. Create the category in Admin → Filters →
                Categories, then re-upload.
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-[var(--admin-ink)]">
              <input
                type="checkbox"
                checked={publish}
                onChange={(event) => setPublish(event.target.checked)}
                className="accent-[var(--admin-accent)]"
              />
              Publish immediately (otherwise products are created as drafts)
            </label>
          </div>
        ) : null}

        {/* ── Stage: Importing ────────────────────────────────────────────── */}
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
              Images are being downloaded and uploaded to storage. Keep this window open.
            </p>
          </div>
        ) : null}

        {/* ── Stage: Done ─────────────────────────────────────────────────── */}
        {stage === 'done' ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Imported" value={createdCount} tone="good" />
              <Stat label="Skipped" value={skippedCount} tone="neutral" />
              <Stat label="Failed" value={failedCount} tone="warn" />
            </div>

            {results.some((r) => r.status !== 'created') ? (
              <div className="space-y-2">
                <div className="max-h-52 overflow-y-auto border border-[var(--admin-line)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--admin-panel)]">
                      <tr className="border-b border-[var(--admin-line)]">
                        <th className="px-3 py-1.5 text-left text-[var(--admin-ink-muted)]">Row</th>
                        <th className="px-3 py-1.5 text-left text-[var(--admin-ink-muted)]">
                          Product
                        </th>
                        <th className="px-3 py-1.5 text-left text-[var(--admin-ink-muted)]">
                          Status
                        </th>
                        <th className="px-3 py-1.5 text-left text-[var(--admin-ink-muted)]">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results
                        .filter((r) => r.status !== 'created')
                        .map((r) => (
                          <tr
                            key={`${r.handle}-${r.row}`}
                            className="border-b border-[var(--admin-line)] last:border-0"
                          >
                            <td className="px-3 py-1.5 text-[var(--admin-ink-muted)]">
                              {r.row || '—'}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-[var(--admin-ink)]">
                              {r.name}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-1.5',
                                r.status === 'failed'
                                  ? 'text-red-600'
                                  : 'text-[var(--admin-ink-muted)]',
                              )}
                            >
                              {r.status}
                            </td>
                            <td className="px-3 py-1.5 text-[var(--admin-ink-muted)]">
                              {r.message ?? '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
                  onClick={() => productImportApi.buildErrorReportCsv(results)}
                >
                  <Download className="h-4 w-4" />
                  Download Error Report (CSV)
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Everything imported cleanly.
              </p>
            )}

            {/* Summary */}
            <p className="text-xs text-[var(--admin-ink-muted)]">
              {createdCount} product{createdCount === 1 ? '' : 's'} created
              {createdCount > 0
                ? ` with ${results.filter((r) => r.status === 'created').reduce((s, r) => s + (r.variants ?? 0), 0)} variants`
                : ''}
              {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
              {failedCount > 0 ? ` · ${failedCount} failed` : ''}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {stage === 'select' ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => close(false)}
            >
              Cancel
            </button>
          ) : null}

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

          {stage === 'done' ? (
            <>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={reset}>
                Upload another file
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
