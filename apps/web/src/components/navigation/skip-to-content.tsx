export interface SkipToContentProps {
  targetId?: string;
}

export function SkipToContent({ targetId = 'main-content' }: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-[var(--shadow-elevated)] focus:outline-none"
    >
      Skip to content
    </a>
  );
}
