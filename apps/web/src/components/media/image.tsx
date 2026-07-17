import * as React from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  aspectRatio?: string;
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
      ...props
    },
    ref,
  ) => {
    const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');

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
            ref={ref}
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
