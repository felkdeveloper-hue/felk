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

/**
 * Premium Mintpay + KOKO + PayHere installment lines shown under product prices.
 * Mintpay stays on the cashback line (nowrap group) so phones lose one wrap line.
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
        'flex flex-col gap-[2px] overflow-visible pb-1 pt-1 font-medium uppercase tracking-[0.03em]',
        isMd
          ? 'text-[11px] sm:text-xs'
          : 'text-[9px] leading-[1.3] sm:text-[10.5px] sm:leading-[1.35]',
        className,
      )}
      style={{ color: '#8a8a8a' }}
      aria-label={`Or ${INSTALLMENT_COUNT} payments of ${installmentLabel} with Mintpay, KOKO, or PayHere`}
    >
      <p className="flex flex-wrap items-center gap-x-[4px] gap-y-0.5">
        <span>
          Or {INSTALLMENT_COUNT} x {installmentLabel} or
        </span>
        <span className="inline-flex items-center gap-x-[4px] whitespace-nowrap">
          {MINTPAY_CASHBACK_PERCENT}% cashback with
          <img
            src="/payments/mintpay-pill.png"
            alt="Mintpay"
            width={68}
            height={17}
            className={cn(
              'inline-block w-auto shrink-0 object-contain object-left align-middle',
              isMd ? 'h-[15px]' : 'h-[12px] sm:h-[13px]',
            )}
            loading="lazy"
            decoding="async"
          />
        </span>
      </p>

      <p className="flex flex-wrap items-center gap-x-[4px] gap-y-0.5">
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
              isMd ? 'h-[20px]' : 'h-[16px] sm:h-[18px]',
            )}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </span>
        <span className="uppercase tracking-[0.03em]">or</span>
        <img
          src="/payments/payhere.svg"
          alt="PayHere"
          width={72}
          height={18}
          className={cn(
            'inline-block w-auto shrink-0 object-contain object-left align-middle',
            isMd ? 'h-[14px]' : 'h-[12px] sm:h-[13px]',
          )}
          loading="lazy"
          decoding="async"
        />
      </p>
    </div>
  );
}
