import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ButtonProps } from '@/components/ui/button';

export function Pagination({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: React.ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

export function PaginationItem(props: React.ComponentPropsWithoutRef<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentPropsWithoutRef<'button'>;

export function PaginationLink({
  className,
  isActive,
  size = 'icon',
  disabled,
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors',
        isActive
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-foreground hover:bg-muted',
        disabled && 'pointer-events-none opacity-40',
        size === 'icon' && 'px-0',
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'button'>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn('gap-1.5 px-4', className)}
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  );
}

export function PaginationNext({ className, ...props }: React.ComponentPropsWithoutRef<'button'>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn('gap-1.5 px-4', className)}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="size-4" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

function getPageRange(
  current: number,
  total: number,
  siblingCount: number,
): (number | 'ellipsis')[] {
  const totalVisible = siblingCount * 2 + 5;

  if (total <= totalVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: (number | 'ellipsis')[] = [1];

  if (showLeftEllipsis) {
    pages.push('ellipsis');
  } else {
    for (let page = 2; page < leftSibling; page += 1) pages.push(page);
  }

  for (let page = leftSibling; page <= rightSibling; page += 1) {
    if (page !== 1 && page !== total) pages.push(page);
  }

  if (showRightEllipsis) {
    pages.push('ellipsis');
  } else {
    for (let page = rightSibling + 1; page < total; page += 1) pages.push(page);
  }

  pages.push(total);

  return pages;
}

export interface PaginationControlProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  siblingCount?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControl({
  page,
  totalPages,
  totalItems,
  siblingCount = 1,
  onPageChange,
  className,
}: PaginationControlProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(page, totalPages, siblingCount);
  const handleChange = (next: number) => {
    onPageChange(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={cn('flex flex-col items-center gap-4 pt-2', className)}>
      <p className="text-muted-foreground text-sm">
        Page <span className="text-foreground font-semibold">{page}</span> of{' '}
        <span className="text-foreground font-semibold">{totalPages}</span>
        {typeof totalItems === 'number' ? (
          <>
            {' '}
            · <span className="text-foreground font-semibold">{totalItems}</span> products
          </>
        ) : null}
      </p>
      <Pagination>
        <PaginationContent className="gap-2">
          <PaginationItem>
            <PaginationPrevious
              disabled={page <= 1}
              onClick={() => handleChange(Math.max(page - 1, 1))}
            />
          </PaginationItem>
          {pages.map((entry, index) =>
            entry === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={entry}>
                <PaginationLink isActive={entry === page} onClick={() => handleChange(entry)}>
                  {entry}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              disabled={page >= totalPages}
              onClick={() => handleChange(Math.min(page + 1, totalPages))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
