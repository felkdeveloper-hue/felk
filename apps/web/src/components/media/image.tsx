import * as React from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  aspectRatio?: string;
}

function markIfComplete(
  node: HTMLImageElement | null,
  setStatus: (status: 'loading' | 'loaded' | 'error') => void,
) {
  if (!node) return;
  // Cached images often skip `onLoad` — detect that so we never stay invisible.
  if (node.complete) {
    setStatus(node.naturalWidth > 0 ? 'loaded' : 'error');
  }
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      className,
      containerClassName,
      aspectRatio,
      loading = 'lazy',
      decoding = 'async',
      onLoad,
      onError,
      alt,
      src,
      ...props
    },
    ref,
  ) => {
    const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
    const imgRef = React.useRef<HTMLImageElement | null>(null);

    React.useLayoutEffect(() => {
      setStatus('loading');
      markIfComplete(imgRef.current, setStatus);
    }, [src]);

    const setRefs = React.useCallback(
      (node: HTMLImageElement | null) => {
        imgRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        markIfComplete(node, setStatus);
      },
      [ref],
    );

    return (
      <div
        data-slot="image"
        className={cn('bg-muted relative overflow-hidden', containerClassName)}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {status === 'loading' ? <Skeleton className="absolute inset-0 rounded-none" /> : null}

        {status === 'error' ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
            <ImageOff className="size-6" />
          </div>
        ) : (
          <img
            ref={setRefs}
            src={src}
            alt={alt}
            loading={loading}
            decoding={decoding}
            className={cn(
              'size-full object-cover transition-opacity duration-300',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
              className,
            )}
            onLoad={(event) => {
              setStatus('loaded');
              onLoad?.(event);
            }}
            onError={(event) => {
              setStatus('error');
              onError?.(event);
            }}
            {...props}
          />
        )}
      </div>
    );
  },
);

Image.displayName = 'Image';
