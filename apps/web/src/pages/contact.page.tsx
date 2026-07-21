import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { useContactInfos, useCmsPage, usePublicSettings, useSocialLinks } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { Button } from '@/components/ui/button';
import { AboutImageStack } from '@/components/storefront/about-image-stack';
import { ContactForm } from '@/components/storefront/contact-form';
import { ContactPopup } from '@/components/storefront/contact-popup';
import { MotionItem, MotionReveal } from '@/components/storefront/motion-reveal';
import { SocialIconLink } from '@/components/storefront/social-icon-link';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { extractSeo, getSetting } from '@/utils/cms';

const FACEBOOK_URL = 'https://www.facebook.com/fashionedge.lk/';

const FE_ABOUT = {
  title: 'Fashion Edge',
  headline: 'Trends, style, and everyday fashion from the heart of Kandy.',
  intro:
    'We bring new trends, varieties, and designs to the floor — clothing made for how you actually dress.',
  body: 'From oversized tees and denim to jackets, shoes, and accessories, Fashion Edge is a destination for women who want fresh looks without the fuss. Visit our Kotugodella flagship or shop online — and say hello anytime.',
  followers: '48K+',
  recommend: '76%',
  category: "Women's clothes shop",
};

const FE_VISIT = {
  address: 'No 14 Kotugodella Veediya, Kandy, Sri Lanka',
  phones: ['+94 812 204 315', '+94 75 118 8664'],
  emails: ['info@fe.lk', 'support@fe.lk'],
  hours: 'Daily · 9:00 AM – 8:00 PM',
};

const GALLERY = [
  { src: '/catalog/women/women-01.jpg', alt: 'Fashion Edge look — street style' },
  { src: '/catalog/women/women-08.jpg', alt: 'Fashion Edge look — everyday essentials' },
  { src: '/catalog/women/women-14.jpg', alt: 'Fashion Edge look — seasonal edit' },
  { src: '/catalog/women/women-18.jpg', alt: 'Fashion Edge look — statement pieces' },
  { src: '/catalog/women/women-21.jpg', alt: 'Fashion Edge look — new arrivals' },
  { src: '/catalog/categories/new-arrivals.png', alt: 'New arrivals at Fashion Edge' },
] as const;

const DEFAULT_SOCIALS = [
  { id: 'fb', platform: 'facebook', url: FACEBOOK_URL },
  { id: 'ig', platform: 'instagram', url: 'https://www.instagram.com/fashion__edge__/' },
  { id: 'tt', platform: 'tiktok', url: 'https://www.tiktok.com/@fashion_edge_' },
];

export function ContactPage() {
  const pageQuery = useCmsPage('contact');
  const aboutQuery = useCmsPage('about');
  const settingsQuery = usePublicSettings();
  const contactQuery = useContactInfos();
  const socialQuery = useSocialLinks();

  const page = pageQuery.data;
  const about = aboutQuery.data;
  const settings = settingsQuery.data;
  const contactInfos = contactQuery.data?.data ?? [];
  const socialLinks = socialQuery.data?.data?.length ? socialQuery.data.data : DEFAULT_SOCIALS;
  const seo = extractSeo(page, settings);
  const title = seo.title ?? 'Contact';
  const description =
    seo.description ??
    'Visit Fashion Edge in Kandy or send us a message — we would love to hear from you.';

  const aboutTitle = about?.title ?? FE_ABOUT.title;

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

      <ContactPopup />

      {/* About */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="border-border relative overflow-hidden border-b"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--muted))_0%,transparent_50%)]"
        />
        <Container className="relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24 xl:gap-16">
          <MotionReveal className="max-w-xl space-y-8">
            <div className="space-y-4">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.28em]">
                About us
              </p>
              <h1
                id="about-heading"
                className="font-display text-foreground text-5xl font-bold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl"
              >
                {aboutTitle}
              </h1>
              <p className="text-foreground/90 max-w-md text-xl font-medium leading-snug sm:text-2xl">
                {FE_ABOUT.headline}
              </p>
            </div>

            <div className="space-y-4">
              {about?.body ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: about.body }}
                />
              ) : (
                <>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">
                    {FE_ABOUT.intro}
                  </p>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">
                    {FE_ABOUT.body}
                  </p>
                </>
              )}
            </div>

            <dl className="border-border grid grid-cols-3 gap-4 border-y py-5">
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Community
                </dt>
                <dd className="font-display text-foreground mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {FE_ABOUT.followers}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Loved by
                </dt>
                <dd className="font-display text-foreground mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {FE_ABOUT.recommend}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Open
                </dt>
                <dd className="font-display text-foreground mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  9–8
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">
                  Follow on Facebook
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <div className="flex items-center gap-2">
                {socialLinks.map((link) => (
                  <SocialIconLink key={link.id} platform={link.platform} url={link.url} />
                ))}
              </div>
            </div>

            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              No 14 Kotugodella Veediya, Kandy
            </p>
          </MotionReveal>

          <AboutImageStack className="lg:justify-self-end" />
        </Container>
      </section>

      {/* Gallery */}
      <section aria-labelledby="gallery-heading" className="bg-muted/30">
        <Container className="py-14 sm:py-20">
          <MotionReveal className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
            <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">The look</p>
            <h2 id="gallery-heading" className="font-display text-foreground text-3xl sm:text-4xl">
              From our floor to your feed
            </h2>
            <p className="text-muted-foreground">
              Fresh drops, everyday fits, and the styles our{' '}
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Facebook community
              </a>{' '}
              loves — {FE_ABOUT.followers} strong.
            </p>
          </MotionReveal>

          <MotionReveal stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {GALLERY.map((item) => (
              <MotionItem key={item.src}>
                <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    aspectRatio="1/1"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </MotionItem>
            ))}
          </MotionReveal>
        </Container>
      </section>

      {/* Visit / contact details */}
      <section aria-labelledby="visit-heading" className="border-border border-y">
        <Container className="py-14 sm:py-20">
          <MotionReveal className="mb-10 max-w-2xl space-y-3">
            <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">Visit us</p>
            <h2 id="visit-heading" className="font-display text-foreground text-3xl sm:text-4xl">
              Flagship store · Kandy
            </h2>
            <p className="text-muted-foreground">
              {FE_ABOUT.category}. Walk in for sizing help, new arrivals, or just to see what&apos;s
              trending — we&apos;re open every day.
            </p>
          </MotionReveal>

          <MotionReveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={MapPin}
              label="Address"
              value={contactInfos.find((i) => i.type === 'address')?.value ?? FE_VISIT.address}
            />
            <InfoCard
              icon={Phone}
              label="Phone"
              value={
                contactInfos.find((i) => i.type === 'phone')?.value ?? FE_VISIT.phones.join(' · ')
              }
              href={`tel:${(contactInfos.find((i) => i.type === 'phone')?.value ?? FE_VISIT.phones[0]!).replace(/\s/g, '')}`}
            />
            <InfoCard
              icon={Mail}
              label="Email"
              value={
                contactInfos.find((i) => i.type === 'email')?.value ??
                getSetting<string>(settings, 'contact.email') ??
                FE_VISIT.emails[0]!
              }
              href={`mailto:${contactInfos.find((i) => i.type === 'email')?.value ?? getSetting<string>(settings, 'contact.email') ?? FE_VISIT.emails[0]!}`}
            />
            <InfoCard icon={Clock} label="Hours" value={FE_VISIT.hours} />
          </MotionReveal>
        </Container>
      </section>

      {/* Form */}
      <section id="message" aria-labelledby="contact-form-heading" className="bg-muted/30">
        <Container className="grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <MotionReveal className="space-y-4">
            <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">Contact</p>
            <h2
              id="contact-form-heading"
              className="font-display text-foreground text-3xl sm:text-4xl"
            >
              Send a message
            </h2>
            <p className="text-muted-foreground">
              {getSetting<string>(settings, 'contact.formDescription') ??
                'Questions about sizing, orders, or collaborations? Our team typically responds within one business day.'}
            </p>
            <p className="text-muted-foreground text-sm">
              Prefer social? Message us on{' '}
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Facebook
              </a>{' '}
              or email {FE_VISIT.emails[0]}.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.06}>
            <div className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <ContactForm idPrefix="contact-page" />
            </div>
          </MotionReveal>
        </Container>
      </section>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="bg-foreground text-background mb-4 flex size-10 items-center justify-center rounded-2xl">
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="text-foreground mt-2 text-sm leading-relaxed">{value}</p>
    </>
  );

  return (
    <MotionItem>
      {href ? (
        <a
          href={href}
          className="border-border/70 bg-card/90 hover:border-border block h-full rounded-[1.5rem] border p-5 shadow-[var(--shadow-soft)] transition-colors"
        >
          {content}
        </a>
      ) : (
        <div className="border-border/70 bg-card/90 h-full rounded-[1.5rem] border p-5 shadow-[var(--shadow-soft)]">
          {content}
        </div>
      )}
    </MotionItem>
  );
}
