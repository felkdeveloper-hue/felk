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
}: {
  images: ProductMediaRow[];
  onUpload: (file: File) => void;
  onSetPrimary?: (mediaId: string) => void;
  onRemove?: (mediaId: string) => void;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const missing = required && images.length === 0;
  const size = compact ? 'size-16' : 'size-24';

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]',
              size,
            )}
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.alt || 'Product image'}
              className="h-full w-full object-cover"
            />
            {image.isPrimary ? (
              <span className="absolute left-1 top-1 rounded-full bg-[var(--admin-ink)] p-1 text-[var(--admin-surface)]">
                <Star className="size-2.5 fill-current" />
              </span>
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
              {onSetPrimary && !image.isPrimary ? (
                <button
                  type="button"
                  title="Set as primary"
                  className="rounded-md bg-white/90 p-1.5 text-neutral-800 hover:bg-white"
                  onClick={() => onSetPrimary(image.id)}
                >
                  <Star className="size-3.5" />
                </button>
              ) : null}
              {onRemove ? (
                <button
                  type="button"
                  title="Remove image"
                  className="rounded-md bg-white/90 p-1.5 text-red-600 hover:bg-white"
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
              'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[10px] font-medium transition disabled:opacity-60',
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
      ) : null}
    </div>
  );
}
