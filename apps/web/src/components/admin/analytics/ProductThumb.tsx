import { Link } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';

const THUMB_BOX =
  'relative block size-16 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-[var(--admin-line)]';
const THUMB_WRAP = 'inline-flex size-16 shrink-0 overflow-hidden rounded-md';

export function ProductThumb({
  productId,
  src,
  alt,
  className,
  onClick,
}: {
  productId?: string;
  src?: string | null;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const thumb = (
    <span className={cn(THUMB_BOX, className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          className="absolute inset-0 size-full max-h-full max-w-full object-cover"
          containerClassName="absolute inset-0 size-full overflow-hidden"
          sizes="64px"
        />
      ) : (
        <span className="text-muted-foreground flex size-full items-center justify-center text-[10px] font-semibold uppercase">
          FE
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(THUMB_WRAP, 'transition-opacity hover:opacity-85')}
        title={alt}
      >
        {thumb}
      </button>
    );
  }

  if (productId) {
    return (
      <Link
        to={ADMIN_ROUTES.productDetail}
        params={{ productId }}
        className={cn(THUMB_WRAP, 'transition-opacity hover:opacity-85')}
        title="Open product"
      >
        {thumb}
      </Link>
    );
  }

  return thumb;
}
