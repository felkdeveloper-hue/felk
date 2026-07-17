import { ArrowRight } from 'lucide-react';
import { CmsLink } from '@/components/common/cms-link';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import { ROUTES } from '@/constants';
import type { HomeSection } from '@/services/sdk/cms';
import { MotionReveal } from './motion-reveal';

export interface EditorialSectionProps {
  section?: HomeSection;
}

export function EditorialSection({ section }: EditorialSectionProps) {
  const config = section?.config ?? {};
  const imageUrl = (config.imageUrl as string) ?? (config.image as string);
  const ctaUrl = (config.ctaUrl as string) ?? ROUTES.about;
  const ctaLabel = (config.ctaLabel as string) ?? 'Read the story';

  if (!section?.title && !imageUrl) return null;
  if (!section) return null;

  const resolvedSection = section;

  return (
    <Section spacing="lg" className="bg-muted/40">
      <Container>
        <MotionReveal>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5">
              {(config.eyebrow as string) ? (
                <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">
                  {config.eyebrow as string}
                </p>
              ) : null}
              <h2 className="font-display text-foreground text-4xl sm:text-5xl">
                {resolvedSection.title}
              </h2>
              {(config.description as string) || resolvedSection.subtitle ? (
                <p className="text-muted-foreground max-w-lg">
                  {(config.description as string) ?? resolvedSection.subtitle}
                </p>
              ) : null}
              <Button asChild variant="outline" className="rounded-full">
                <CmsLink href={ctaUrl}>
                  {ctaLabel}
                  <ArrowRight />
                </CmsLink>
              </Button>
            </div>
            <div className="overflow-hidden rounded-3xl">
              <Image
                src={imageUrl}
                alt={resolvedSection.title ?? 'Editorial feature'}
                aspectRatio="4/5"
              />
            </div>
          </div>
        </MotionReveal>
      </Container>
    </Section>
  );
}
