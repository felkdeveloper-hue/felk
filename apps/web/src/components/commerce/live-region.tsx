import { useUiStore } from '@/store/ui-store';

export function LiveRegion() {
  const message = useUiStore((state) => state.cartAnnouncement);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
