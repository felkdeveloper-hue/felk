import * as React from 'react';
import { File as FileIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  value?: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const unit = units[exponent] ?? 'B';
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${unit}`;
}

export function FileUpload({
  value = [],
  onChange,
  accept,
  multiple = false,
  maxSizeMb = 10,
  disabled,
  className,
  label = 'Click to upload or drag and drop',
  hint,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);

    const maxBytes = maxSizeMb * 1024 * 1024;
    const accepted: File[] = [];

    for (const file of Array.from(incoming)) {
      if (file.size > maxBytes) {
        setError(`"${file.name}" exceeds the ${maxSizeMb}MB limit.`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    onChange(multiple ? [...value, ...accepted] : [accepted[0] as File]);
  };

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          'border-border bg-muted/40 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragging && 'border-primary bg-accent',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Upload className="text-muted-foreground size-6" />
        <p className="text-foreground text-sm font-medium">{label}</p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </button>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="border-border bg-card flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="text-foreground truncate text-sm">{file.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1 outline-none transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
