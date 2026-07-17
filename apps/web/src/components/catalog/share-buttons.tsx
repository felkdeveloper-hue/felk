import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildAbsoluteUrl } from '@/config';

export interface ShareButtonsProps {
  title: string;
  slug: string;
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url = buildAbsoluteUrl(`/products/${slug}`);

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void share()}>
      <Share2 />
      Share
    </Button>
  );
}
