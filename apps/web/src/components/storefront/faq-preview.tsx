import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useFaqs } from '@/hooks/cms';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { MotionReveal } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface FaqPreviewSectionProps {
  section?: HomeSection;
}

export function FaqPreviewSection({ section }: FaqPreviewSectionProps) {
  const limit = (section?.config?.limit as number) ?? 4;
  const query = useFaqs(limit);

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Support'}
      title={section?.title ?? 'Questions, answered'}
      description={(section?.config?.description as string) ?? 'Quick answers before you shop.'}
      action={
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <Link to={ROUTES.contact}>
            Contact us
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      <Container>
        <AsyncSection
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          data={query.data}
          isEmpty={(result) => !result?.data?.length}
          onRetry={() => void query.refetch()}
          skeleton={<SectionSkeleton />}
          emptyTitle="FAQs coming soon"
        >
          {(result) => (
            <MotionReveal className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible>
                {result.data.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </MotionReveal>
          )}
        </AsyncSection>
      </Container>
    </Section>
  );
}
