import { cn } from '@/lib/utils';

const INSTALLMENT_COUNT = 3;
const MINTPAY_CASHBACK_PERCENT = 2.5;

export interface BnplInstallmentHintProps {
  amount: number;
  currency?: string;
  className?: string;
  /** Slightly larger type for PDP / sheets. */
  size?: 'sm' | 'md';
}

/** Compact amount matching merchant BNPL listing style (e.g. LKR 4,663.00). */
function formatInstallmentAmount(amount: number, currency = 'LKR'): string {
  const formatted = amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/** Official PayHere wordmark: Pay (blue) + Here (golden italic). */
function PayHereMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-baseline font-semibold italic leading-none',
        className,
      )}
      aria-label="PayHere"
    >
      <span style={{ color: '#2E5BCC' }}>Pay</span>
      <span style={{ color: '#F9A51A' }}>Here</span>
    </span>
  );
}

/**
 * Premium Mintpay + KOKO + PayHere installment lines shown under product prices.
 */
export function BnplInstallmentHint({
  amount,
  currency = 'LKR',
  className,
  size = 'sm',
}: BnplInstallmentHintProps) {
  if (!amount || amount <= 0) return null;

  const installment = amount / INSTALLMENT_COUNT;
  const installmentLabel = formatInstallmentAmount(installment, currency);
  const isMd = size === 'md';

  return (
    <div
      className={cn(
        'flex flex-col gap-[3px] overflow-visible pb-1 pt-1 font-medium uppercase tracking-[0.03em]',
        isMd ? 'text-[11px] sm:text-xs' : 'text-[9.5px] leading-[1.35] sm:text-[10.5px]',
        className,
      )}
      style={{ color: '#8a8a8a' }}
      aria-label={`Or ${INSTALLMENT_COUNT} payments of ${installmentLabel} with Mintpay, KOKO, or PayHere`}
    >
      <p className="flex flex-wrap items-center gap-x-[5px] gap-y-0.5">
        <span>
          Or {INSTALLMENT_COUNT} x {installmentLabel} or {MINTPAY_CASHBACK_PERCENT}% cashback with
        </span>
        <img
          src="/payments/mintpay-pill.png"
          alt="Mintpay"
          width={68}
          height={17}
          className={cn(
            'w-auto shrink-0 object-contain object-left',
            isMd ? 'h-[15px]' : 'h-[13px]',
          )}
          loading="lazy"
          decoding="async"
        />
      </p>

      <p className="flex flex-wrap items-center gap-x-[5px] gap-y-0.5">
        <span>
          Or {INSTALLMENT_COUNT} x {installmentLabel} with
        </span>
        <span className="inline-flex shrink-0 items-center overflow-visible py-0.5" aria-hidden>
          <img
            src="/payments/koko-logo.png"
            alt="KOKO"
            width={126}
            height={53}
            className={cn(
              'block w-auto max-w-none object-contain object-left',
              isMd ? 'h-[20px]' : 'h-[18px]',
            )}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </span>
        <span className="uppercase tracking-[0.03em]">or</span>
        <PayHereMark className={isMd ? 'text-[13px]' : 'text-[11.5px]'} />
      </p>
    </div>
  );
}
