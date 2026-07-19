import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.8a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.79a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const platformIcons: Record<string, LucideIcon | typeof TikTokIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  tiktok: TikTokIcon,
};

export interface SocialIconLinkProps {
  platform: string;
  url: string;
  className?: string;
}

export function SocialIconLink({ platform, url, className }: SocialIconLinkProps) {
  const Icon = platformIcons[platform.toLowerCase()] ?? Instagram;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={platform}
      className={cn(
        'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors',
        className,
      )}
    >
      <Icon className="size-4" />
    </a>
  );
}
