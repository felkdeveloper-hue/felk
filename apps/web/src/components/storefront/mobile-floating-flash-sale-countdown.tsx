import { FlashSaleCountdown } from '@/components/storefront/flash-sale-countdown';

/** Fixed mobile pill below the navbar — hidden on desktop. */
export function MobileFloatingFlashSaleCountdown() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[95] lg:hidden"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem + 0.375rem)' }}
      aria-hidden={false}
    >
      <div className="pointer-events-auto flex justify-end px-3.5">
        <FlashSaleCountdown compact />
      </div>
    </div>
  );
}
