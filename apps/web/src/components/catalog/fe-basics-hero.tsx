import { Factory } from 'lucide-react';
import { BlurredBannerImage } from '@/components/media/blurred-banner-image';
import { FE_BASICS_NAME, FE_BASICS_TAGLINE } from '@/constants/fe-basics';
import { cn } from '@/lib/utils';

export function FeBasicsHero({
  imageUrl,
  className,
}: {
  imageUrl?: string | null;
  className?: string;
}) {
  const photo = imageUrl?.trim();

  return (
    <section
      aria-label={`${FE_BASICS_NAME} banner`}
      className={cn(
        'relative overflow-hidden bg-[#14110e] text-[#f6efe4]',
        'h-[min(72vw,26rem)] w-full sm:h-[34vw] sm:max-h-[22rem] sm:min-h-56',
        className,
      )}
    >
      {photo ? (
        <>
          <BlurredBannerImage
            src={photo}
            alt=""
            loading="eager"
            fetchPriority="high"
            objectClass="object-[center_35%] md:object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/35 to-black/75" />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_12%_20%,rgba(198,161,91,0.22),transparent_55%),radial-gradient(90%_70%_at_90%_80%,rgba(198,161,91,0.12),transparent_50%)]"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 z-[1] h-px bg-linear-to-r from-transparent via-[#c6a15b]/70 to-transparent sm:inset-x-16"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 bottom-0 z-[1] h-px bg-linear-to-r from-transparent via-[#c6a15b]/40 to-transparent sm:inset-x-16"
      />

      <div className="relative z-[2] flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c6a15b]/35 bg-[#c6a15b]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8c57a] sm:text-[11px]">
          <Factory className="size-3.5" strokeWidth={1.75} aria-hidden />
          {FE_BASICS_TAGLINE}
        </p>
        <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-[-0.04em] sm:text-7xl">
          {FE_BASICS_NAME}
        </h1>
        <p className="mt-4 max-w-md text-xs tracking-[0.04em] text-[#f6efe4]/70 sm:text-sm">
          Everyday pieces we cut and sew in our own factory. Not imported — made for this wardrobe.
        </p>
      </div>
    </section>
  );
}

export function FeBasicsIntro({ description }: { description?: string | null }) {
  const copy =
    description?.trim() ||
    'FE Basics is our in-house line — the clothes we manufacture ourselves. Shop this page for factory-made staples. Imported pieces stay in the other categories.';

  return (
    <div className="border-b border-[#c6a15b]/20 bg-[#f7f1e8] px-4 py-5 text-center sm:px-6 sm:py-6">
      <p className="mx-auto max-w-2xl text-[13px] leading-relaxed text-[#3d3428] sm:text-sm">{copy}</p>
    </div>
  );
}
