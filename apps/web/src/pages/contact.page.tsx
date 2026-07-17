import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useContactInfos, useCmsPage, usePublicSettings } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { extractSeo, getSetting } from '@/utils/cms';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

export function ContactPage() {
  const pageQuery = useCmsPage('contact');
  const settingsQuery = usePublicSettings();
  const contactQuery = useContactInfos();

  const page = pageQuery.data;
  const settings = settingsQuery.data;
  const contactInfos = contactQuery.data?.data ?? [];
  const seo = extractSeo(page, settings);
  const title = seo.title ?? 'Contact';
  const description = seo.description ?? 'We would love to hear from you.';

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success('Message sent', {
      description: `Thanks ${values.name}, we'll reply to ${values.email} soon.`,
    });
    form.reset();
  });

  return (
    <>
      <Seo
        title={title}
        description={description}
        url={buildAbsoluteUrl('/contact')}
        siteName={seo.siteName ?? siteConfig.name}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Home', url: buildAbsoluteUrl('/') },
          { name: title, url: buildAbsoluteUrl('/contact') },
        ])}
      />

      <Container className="py-14 sm:py-20">
        <header className="mx-auto mb-12 max-w-3xl space-y-3 text-center">
          <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">Contact</p>
          <h1 className="font-display text-foreground text-4xl sm:text-5xl">
            {page?.title ?? title}
          </h1>
          <p className="text-muted-foreground">{page?.excerpt ?? description}</p>
        </header>

        {page?.body ? (
          <div
            className="prose prose-neutral dark:prose-invert mx-auto mb-12 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        ) : null}
      </Container>

      <section
        aria-labelledby="contact-form-heading"
        className="border-border bg-muted/30 border-t"
      >
        <Container className="grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div className="space-y-4">
            <h2 id="contact-form-heading" className="font-display text-foreground text-3xl">
              Send a message
            </h2>
            <p className="text-muted-foreground">
              {getSetting<string>(settings, 'contact.formDescription') ??
                'Questions about sizing, orders, or collaborations? Our team typically responds within one business day.'}
            </p>

            {contactInfos.length ? (
              <ul className="space-y-3 pt-4 text-sm">
                {contactInfos.map((info) => (
                  <li key={info.id}>
                    <span className="text-foreground font-medium">{info.label}: </span>
                    <span className="text-muted-foreground">{info.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <form
            onSubmit={onSubmit}
            className="border-border bg-card space-y-4 rounded-2xl border p-6 sm:p-8"
          >
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="contact-name"
                autoComplete="name"
                {...form.register('name')}
                aria-invalid={Boolean(form.formState.errors.name)}
              />
              {form.formState.errors.name ? (
                <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="contact-email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
                aria-invalid={Boolean(form.formState.errors.email)}
              />
              {form.formState.errors.email ? (
                <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="contact-message"
                rows={5}
                {...form.register('message')}
                aria-invalid={Boolean(form.formState.errors.message)}
              />
              {form.formState.errors.message ? (
                <p className="text-destructive text-sm">{form.formState.errors.message.message}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="rounded-full px-8"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </Container>
      </section>
    </>
  );
}
