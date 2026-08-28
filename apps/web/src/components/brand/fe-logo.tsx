import { cn } from '@/lib/utils';

/** Brand mint circle — original Fashion Edge mark background. */
export const FE_LOGO_MINT = '#C1F0F6';
export const FE_LOGO_NAVY = '#000B29';

/** @deprecated Use FE_LOGO_MINT — kept for any lingering imports. */
export const FE_LOGO_BLUE = FE_LOGO_MINT;

export interface FeLogoProps {
  className?: string;
  /** Pixel size of the circular mark (width & height). */
  size?: number;
  title?: string;
  /** Legacy prop — mint circle always uses navy "fe." text. */
  inverted?: boolean;
}

/** Circular Fashion Edge mark: "fe." on brand mint. */
export function FeLogo({ className, size = 40, title = 'Fashion Edge' }: FeLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <title>{title}</title>
      <circle cx="32" cy="32" r="32" fill={FE_LOGO_MINT} />
      <text
        x="32"
        y="39.5"
        textAnchor="middle"
        fill={FE_LOGO_NAVY}
        fontFamily="Figtree, Syne, system-ui, sans-serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="-0.04em"
      >
        fe.
      </text>
    </svg>
  );
}
