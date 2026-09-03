import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { ROUTES } from '@/constants';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { cn } from '@/lib/utils';
import { toStorefrontMediaUrl } from '@/utils/media-url';

/** Placement key — Admin → Banners → Lookbook videos. */
export const HOME_LOOKBOOK_VIDEOS_PLACEMENT = 'home_lookbook_videos';

const WOMEN_SHOP = { to: ROUTES.products, search: { gender: 'women' as const } };

type LookbookItem = {
  id: string;
  title: string;
  videoUrl?: string;
  posterUrl?: string;
};

const PLACEHOLDER_ITEMS: LookbookItem[] = [
  { id: 'placeholder-1', title: 'Look 1' },
  { id: 'placeholder-2', title: 'Look 2' },
  { id: 'placeholder-3', title: 'Look 3' },
];

function resolveItems(banners: PromoBanner[]): LookbookItem[] {
  const sorted = [...banners]
    .filter((b) => b.videoUrl || b.imageUrl)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  if (!sorted.length) return PLACEHOLDER_ITEMS;

  return sorted.map((banner) => ({
    id: banner.id,
    title: banner.title || 'Look',
    videoUrl: banner.videoUrl ? toStorefrontMediaUrl(banner.videoUrl) : undefined,
    posterUrl: banner.imageUrl ? toStorefrontMediaUrl(banner.imageUrl) : undefined,
  }));
}

function useIsDesktopCarousel(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpoint]);
  return isDesktop;
}

function LookbookVideoCard({
  item,
  isActive,
  onActivate,
  className,
  /** When set, opts out of the global sharp-corner reset so video clips to radius. */
  rounded,
}: {
  item: LookbookItem;
  isActive: boolean;
  onActivate: () => void;
  className?: string;
  rounded?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) return;

    video.muted = true;
    setMuted(true);

    if (isActive) {
      void video.play().catch(() => {
        /* autoplay may be blocked — still show poster frame */
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive, item.videoUrl]);

  const toggleMute = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const requestFullscreen = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const req =
      video.requestFullscreen?.bind(video) ??
      (
        video as HTMLVideoElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        }
      ).webkitRequestFullscreen?.bind(video);
    void req?.();
  };

  return (
    <article
      data-radius={rounded ? 'lookbook' : undefined}
      className={cn(
        'relative isolate aspect-[9/16] overflow-hidden bg-zinc-200 transition-[transform,opacity,box-shadow] duration-300 ease-out',
        className,
      )}
      onClick={onActivate}
    >
      {item.videoUrl ? (
        <video
          ref={videoRef}
          src={item.videoUrl}
          poster={item.posterUrl}
          data-radius={rounded ? 'lookbook' : undefined}
          className="absolute inset-0 size-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={item.title}
        />
      ) : (
        <div
          data-radius={rounded ? 'lookbook' : undefined}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-300 to-zinc-400"
        >
          <p className="text-foreground/50 px-6 text-center text-xs font-medium uppercase tracking-[0.16em]">
            Upload video in admin
          </p>
        </div>
      )}

      <div
        aria-hidden
        data-radius={rounded ? 'lookbook' : undefined}
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15"
      />

      {item.videoUrl ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            type="button"
            data-radius="pill"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            data-radius="pill"
            onClick={requestFullscreen}
            aria-label="Fullscreen"
            className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-5">
        <Link
          to={WOMEN_SHOP.to}
          search={WOMEN_SHOP.search}
          preload="intent"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-h-10 min-w-[8.5rem] items-center justify-center rounded-md bg-[#8b7d5b] px-5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
        >
          Shop Now
        </Link>
      </div>
    </article>
  );
}

/** Mobile-only: infinite centered coverflow carousel (IMAGE 4). */
function MobileLookbookCarousel({ items }: { items: LookbookItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    containScroll: false,
    dragFree: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="relative px-0 py-2">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={item.id}
                className="min-w-0 shrink-0 grow-0 basis-[72%] px-2 sm:basis-[68%]"
              >
                <LookbookVideoCard
                  item={item}
                  isActive={isActive}
                  onActivate={() => emblaApi?.scrollTo(index)}
                  rounded
                  className={cn(
                    'w-full rounded-[1.75rem] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)]',
                    isActive ? 'scale-100 opacity-100' : 'scale-[0.88] opacity-80',
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous video"
            onClick={prev}
            className="absolute left-[max(0.35rem,calc(14%-1.1rem))] top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-md backdrop-blur-sm transition-opacity hover:bg-black/55"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Next video"
            onClick={next}
            className="absolute right-[max(0.35rem,calc(14%-1.1rem))] top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-md backdrop-blur-sm transition-opacity hover:bg-black/55"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </button>
        </>
      ) : null}
    </div>
  );
}

/** Desktop — previous scroll-snap carousel (unchanged behavior). */
function DesktopLookbookCarousel({ items }: { items: LookbookItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    const cards = node.querySelectorAll<HTMLElement>('[data-lookbook-card]');
    const card = cards[index];
    if (!card) return;
    const left = card.offsetLeft - (node.clientWidth - card.offsetWidth) / 2;
    node.scrollTo({ left, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const onScroll = () => {
      const cards = [...node.querySelectorAll<HTMLElement>('[data-lookbook-card]')];
      if (!cards.length) return;
      const center = node.scrollLeft + node.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const mid = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(mid - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setActiveIndex(best);
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    requestAnimationFrame(() => scrollToIndex(0));
    return () => node.removeEventListener('scroll', onScroll);
  }, [items.length, scrollToIndex]);

  const prev = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const next = () => scrollToIndex(Math.min(items.length - 1, activeIndex + 1));

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[calc(50%-120px)] pb-2 pt-1"
      >
        {items.map((item, index) => (
          <div key={item.id} data-lookbook-card className="snap-center">
            <LookbookVideoCard
              item={item}
              isActive={index === activeIndex}
              onActivate={() => scrollToIndex(index)}
              className={cn(
                'w-[240px] shrink-0 rounded-[1.35rem] shadow-[0_12px_40px_-18px_rgba(0,0,0,0.45)]',
                index === activeIndex ? 'scale-100' : 'scale-[0.94] opacity-90',
              )}
            />
          </div>
        ))}
      </div>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous video"
            onClick={prev}
            disabled={activeIndex <= 0}
            className="absolute left-4 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next video"
            onClick={next}
            disabled={activeIndex >= items.length - 1}
            className="absolute right-4 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

/**
 * Lookbook video carousel.
 * Mobile: infinite circular coverflow (IMAGE 4). Desktop: previous scroll-snap UI.
 */
export function HomeLookbookVideosSection() {
  const { data } = usePromoBanners(HOME_LOOKBOOK_VIDEOS_PLACEMENT);
  const items = resolveItems(data?.data ?? []);
  const isDesktop = useIsDesktopCarousel();

  return (
    <section aria-label="Lookbook videos" className="bg-background relative py-4 sm:py-6">
      {isDesktop ? (
        <DesktopLookbookCarousel items={items} />
      ) : (
        <MobileLookbookCarousel items={items} />
      )}
    </section>
  );
}
