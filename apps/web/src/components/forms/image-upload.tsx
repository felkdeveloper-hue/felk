import * as React from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageUploadProps {
  value?: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

interface PreviewImage {
  file: File;
  url: string;
}

export function ImageUpload({
  value = [],
  onChange,
  multiple = false,
  maxSizeMb = 5,
  disabled,
  className,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<PreviewImage[]>([]);

  React.useEffect(() => {
    const next = value.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);

    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [value]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);

    const maxBytes = maxSizeMb * 1024 * 1024;
    const accepted: File[] = [];

    for (const file of Array.from(incoming)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are supported.');
        continue;
      }
      if (file.size > maxBytes) {
        setError(`"${file.name}" exceeds the ${maxSizeMb}MB limit.`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    onChange(multiple ? [...value, ...accepted] : [accepted[0] as File]);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-3">
        {previews.map((preview, index) => (
          <div
            key={preview.url}
            className="border-border group relative size-24 overflow-hidden rounded-lg border"
          >
            <img src={preview.url} alt={preview.file.name} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="bg-foreground/70 text-background absolute right-1 top-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${preview.file.name}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {(multiple || previews.length === 0) && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground flex size-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-colors',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-[11px] font-medium">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
