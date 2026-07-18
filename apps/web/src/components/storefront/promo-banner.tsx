import { CmsLink } from '@/components/common/cms-link';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import { usePromoBanners } from '@/hooks/cms';
import type { HomeSection } from '@/services/sdk/cms';
import { ArrowRight } from 'lucide-react';
import { AsyncSection } from './async-section';
import { MotionReveal } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface PromoBannerSectionProps {
  section?: HomeSection;
  placement?: string;
}

export function PromoBannerSection({ section, placement = 'home' }: PromoBannerSectionProps) {
  const query = usePromoBanners(placement);
  const banner = query.data?.data[0];

  return (
    <section aria-label="Promotion" className="py-10 sm:py-16">
      <Container>
        <AsyncSection
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          data={banner}
          isEmpty={(value) => !value?.title}
          onRetry={() => void query.refetch()}
          skeleton={<SectionSkeleton />}
          emptyTitle=""
          emptyDescription=""
        >
          {(item) => (
            <MotionReveal>
              <div className="bg-foreground text-background relative min-h-[22rem] overflow-hidden rounded-[2rem] shadow-[var(--shadow-elevated)] sm:min-h-[26rem]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    className="absolute inset-0 object-cover opacity-55"
                    containerClassName="absolute inset-0"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent dark:from-black/70 dark:via-black/40" />
                <div className="relative flex h-full min-h-[22rem] flex-col justify-end gap-6 px-8 py-10 text-white sm:min-h-[26rem] sm:flex-row sm:items-end sm:justify-between sm:px-12 sm:py-14">
                  <div className="max-w-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                      {(section?.config?.eyebrow as string) ?? 'Limited offer'}
                    </p>
                    <h2 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-6xl">
                      {item.title}
                    </h2>
                    {item.subtitle ? (
                      <p className="max-w-md text-white/80">{item.subtitle}</p>
                    ) : null}
                  </div>
                  {item.linkUrl ? (
                    <Button
                      asChild
                      size="lg"
                      className="bg-background text-foreground hover:bg-background/90"
                    >
                      <CmsLink href={item.linkUrl!}>
                        {item.ctaLabel ?? 'Shop now'}
                        <ArrowRight />
                      </CmsLink>
                    </Button>
                  ) : null}
                </div>
              </div>
            </MotionReveal>
          )}
        </AsyncSection>
      </Container>
    </section>
  );
}
