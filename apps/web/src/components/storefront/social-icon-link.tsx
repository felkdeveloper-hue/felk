import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const platformIcons: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
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
