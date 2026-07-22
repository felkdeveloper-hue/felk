import { useRef } from 'react';
import { Star, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductMediaRow } from '@/services/sdk/admin';

export function ImageUploader({
  images,
  onUpload,
  onSetPrimary,
  onRemove,
  required = false,
  disabled = false,
  uploading = false,
  compact = false,
  hint,
}: {
  images: ProductMediaRow[];
  onUpload: (file: File) => void;
  onSetPrimary?: (mediaId: string) => void;
  onRemove?: (mediaId: string) => void;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  compact?: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const missing = required && images.length === 0;
  const size = compact ? 'size-16' : 'size-24';

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              'group relative overflow-hidden rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]',
              size,
            )}
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.alt || 'Product image'}
              className="h-full w-full object-cover"
            />
            {image.isPrimary ? (
              <span
                title="Main listing photo"
                className="absolute left-0 top-0 inline-flex items-center gap-0.5 bg-[var(--admin-ink)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--admin-surface)]"
              >
                <Star className="size-2.5 fill-current" />
                {!compact ? 'Main' : null}
              </span>
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
              {onSetPrimary && !image.isPrimary ? (
                <button
                  type="button"
                  title="Set as main listing photo"
                  className="rounded-none bg-white/90 p-1.5 text-neutral-800 hover:bg-white"
                  onClick={() => onSetPrimary(image.id)}
                >
                  <Star className="size-3.5" />
                </button>
              ) : null}
              {onRemove ? (
                <button
                  type="button"
                  title="Remove image"
                  className="rounded-none bg-white/90 p-1.5 text-red-600 hover:bg-white"
                  onClick={() => onRemove(image.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {!disabled ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-none border-2 border-dashed text-[10px] font-medium transition disabled:opacity-60',
              size,
              missing
                ? 'border-red-300 text-red-600 hover:bg-red-50'
                : 'hover:border-[var(--admin-accent)]/50 border-[var(--admin-line)] text-neutral-500 hover:text-[var(--admin-ink)]',
            )}
          >
            <Upload className="size-4" />
            {uploading ? 'Uploading…' : 'Add'}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />

      {missing ? (
        <p className="mt-2 text-xs font-medium text-red-600">At least one image is required.</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}
