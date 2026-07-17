import { useAnnouncements } from '@/hooks/cms';
import { cn } from '@/lib/utils';
import { CmsLink } from '@/components/common/cms-link';
import { Skeleton } from '@/components/ui/skeleton';

export function AnnouncementBar() {
  const { data, isLoading } = useAnnouncements();
  const announcement = data?.data[0];

  if (isLoading) {
    return <Skeleton className="h-10 w-full rounded-none" aria-hidden />;
  }

  if (!announcement?.message) return null;

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className={cn('px-4 py-2.5 text-center text-sm font-medium')}
      style={{
        backgroundColor: announcement.backgroundColor ?? undefined,
        color: announcement.textColor ?? undefined,
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <p className="truncate">{announcement.message}</p>
        {announcement.linkUrl ? (
          <CmsLink
            href={announcement.linkUrl}
            className="shrink-0 underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            {announcement.linkLabel ?? 'Learn more'}
          </CmsLink>
        ) : null}
      </div>
    </div>
  );
}
