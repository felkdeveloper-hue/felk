import { useSocialLinks } from '@/hooks/cms';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HoverLift, MotionItem, MotionReveal } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface SocialGallerySectionProps {
  section?: HomeSection;
}

export function SocialGallerySection({ section }: SocialGallerySectionProps) {
  const query = useSocialLinks();
  const configImages = (section?.config?.images as string[]) ?? [];

  const items =
    configImages.length > 0
      ? configImages.map((url, index) => ({
          id: String(index),
          src: url,
          alt: `Social image ${index + 1}`,
          href: undefined as string | undefined,
        }))
      : (query.data?.data ?? []).map((link) => ({
          id: link.id,
          src: link.icon ?? '',
          alt: link.platform,
          href: link.url,
        }));

  const visibleItems = items.filter((item) => item.src || item.href);

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Follow along'}
      title={section?.title ?? 'Instagram & social'}
      description={
        (section?.config?.description as string) ?? 'See how our community styles the collection.'
      }
    >
      <Container>
        <AsyncSection
          isLoading={query.isLoading && !configImages.length}
          isError={query.isError && !configImages.length}
          error={query.error}
          data={visibleItems}
          isEmpty={(value) => !value.length}
          onRetry={() => void query.refetch()}
          skeleton={<SectionSkeleton />}
          emptyTitle="Social gallery coming soon"
        >
          {(galleryItems) => (
            <MotionReveal stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {galleryItems.map((item) => (
                <MotionItem key={item.id}>
                  <HoverLift>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.alt}
                        className="bg-muted block overflow-hidden rounded-xl"
                      >
                        {item.src ? (
                          <Image src={item.src} alt={item.alt} aspectRatio="1/1" />
                        ) : (
                          <div className="bg-accent text-accent-foreground flex aspect-square items-center justify-center p-4 text-center text-sm font-medium">
                            {item.alt}
                          </div>
                        )}
                      </a>
                    ) : (
                      <div className="bg-muted overflow-hidden rounded-xl">
                        <Image src={item.src} alt={item.alt} aspectRatio="1/1" />
                      </div>
                    )}
                  </HoverLift>
                </MotionItem>
              ))}
            </MotionReveal>
          )}
        </AsyncSection>
      </Container>
    </Section>
  );
}
