import { Star } from 'lucide-react';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import type { HomeSection } from '@/services/sdk/cms';
import { MotionReveal, MotionItem } from './motion-reveal';

interface Review {
  id: string;
  author: string;
  quote: string;
  rating?: number;
}

export interface CustomerReviewsSectionProps {
  section?: HomeSection;
}

export function CustomerReviewsSection({ section }: CustomerReviewsSectionProps) {
  const reviews = (section?.config?.reviews as Review[]) ?? [];

  if (!reviews.length) {
    return (
      <Section spacing="default" title={section?.title ?? 'Customer reviews'}>
        <Container>
          <p className="text-muted-foreground text-center text-sm">
            Reviews will appear here once configured in the CMS home section.
          </p>
        </Container>
      </Section>
    );
  }

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Testimonials'}
      title={section?.title ?? 'Customer reviews'}
      description={(section?.config?.description as string) ?? 'What our community is saying.'}
    >
      <Container>
        <MotionReveal stagger className="grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <MotionItem key={review.id}>
              <figure className="border-border bg-card rounded-2xl border p-6">
                <div
                  className="text-primary mb-4 flex gap-1"
                  aria-label={`${review.rating ?? 5} out of 5 stars`}
                >
                  {Array.from({ length: review.rating ?? 5 }, (_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <blockquote className="text-foreground text-sm leading-relaxed">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <figcaption className="text-muted-foreground mt-4 text-sm font-medium">
                  — {review.author}
                </figcaption>
              </figure>
            </MotionItem>
          ))}
        </MotionReveal>
      </Container>
    </Section>
  );
}
