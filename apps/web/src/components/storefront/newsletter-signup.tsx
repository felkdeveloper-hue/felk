import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { usePublicSettings } from '@/hooks/cms';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSetting } from '@/utils/cms';
import type { HomeSection } from '@/services/sdk/cms';
import { MotionReveal } from './motion-reveal';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export interface NewsletterSignupSectionProps {
  section?: HomeSection;
}

export function NewsletterSignupSection({ section }: NewsletterSignupSectionProps) {
  const { data: settings } = usePublicSettings();
  const [submitting, setSubmitting] = useState(false);
  const enabled = getSetting<boolean>(settings, 'newsletter.enabled', true) !== false;

  const title =
    (section?.title as string) ??
    getSetting<string>(settings, 'newsletter.title') ??
    getSetting<string>(settings, 'newsletter.heading') ??
    'Join our newsletter';
  const description =
    (section?.config?.description as string) ??
    getSetting<string>(settings, 'newsletter.description') ??
    'Early access to drops, styling notes, and private sale invitations.';

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  if (!enabled) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      // Placeholder until a public subscription endpoint is available.
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success('Thanks for subscribing!', {
        description: `We'll send updates to ${values.email}.`,
      });
      form.reset();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Section spacing="default" className="bg-foreground text-white">
      <Container>
        <MotionReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">
              Stay in touch
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">
              {title}
            </h2>
            <p className="mt-3 text-white/70">{description}</p>

            <form
              onSubmit={onSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start"
            >
              <div className="flex-1 text-left">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  className="text-foreground h-12 rounded-full border-white/15 bg-white"
                  {...form.register('email')}
                />
                {form.formState.errors.email ? (
                  <p className="mt-1 text-sm text-red-300">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="text-foreground h-12 rounded-full bg-white px-8 hover:bg-white/90"
              >
                {submitting ? 'Subscribing…' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </MotionReveal>
      </Container>
    </Section>
  );
}
