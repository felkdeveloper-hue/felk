import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Clock, MapPin } from 'lucide-react';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { Button } from '@/components/ui/button';
import { ContactPopup } from '@/components/storefront/contact-popup';
import { ROUTES } from '@/constants';
import { usePromoBanners } from '@/hooks/cms';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { toStorefrontMediaUrl } from '@/utils/media-url';

/** Admin → Banners → Contact page placement key. */
export const CONTACT_PAGE_BANNER_PLACEMENT = 'contact_page';

const CONTACT_PHONE = '078 8888 581';
const CONTACT_PHONE_TEL = '+94788888581';
const CONTACT_EMAIL = 'info@fe.lk';

const STORES = [
  {
    city: 'Kandy',
    address: 'Kotugodella Veediya, Kandy',
    hours: '9:00 AM – 8:00 PM',
  },
  {
    city: 'Galle',
    address: 'Level 02, Galle City Center, Galle',
    hours: '9:00 AM – 8:00 PM',
  },
] as const;

/**
 * Contact page — mobile redesign (stores + details + message).
 * Desktop keeps the existing Coming soon placeholder unchanged.
 */
export function ContactPage() {
  const [messageOpen, setMessageOpen] = useState(false);
  const { data } = usePromoBanners(CONTACT_PAGE_BANNER_PLACEMENT);

  const bannerUrl = useMemo(() => {
    const rows = [...(data?.data ?? [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const url = rows[0]?.imageUrl?.trim();
    return url ? toStorefrontMediaUrl(url) : undefined;
  }, [data?.data]);

  return (
    <>
      <Seo
        title="Contact"
        description="Visit Fashion Edge in Kandy or Galle, or send us a message."
        url={buildAbsoluteUrl('/contact')}
        siteName={siteConfig.name}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Home', url: buildAbsoluteUrl('/') },
          { name: 'Contact', url: buildAbsoluteUrl('/contact') },
        ])}
      />

      {/* ── Desktop — existing Coming soon (unchanged) ── */}
      <Container className="hidden min-h-[50vh] flex-col items-center justify-center py-16 text-center sm:py-24 lg:flex">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.28em]">
          Contact
        </p>
        <h1 className="font-display text-foreground mt-3 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Coming soon
        </h1>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
          Our dedicated contact page is being redesigned. For store details, brand story, and
          messages, visit About Us for now.
        </p>
        <Button asChild className="mt-8">
          <Link to={ROUTES.about}>Go to About Us</Link>
        </Button>
      </Container>

      {/* ── Mobile contact redesign ── */}
      <div className="bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:hidden">
        <div className="mx-auto max-w-lg px-5 pt-5">
          {/* Store banner */}
          <div data-radius="lookbook" className="overflow-hidden rounded-[1.15rem] bg-zinc-200">
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Fashion Edge store"
                aspectRatio="16/9"
                className="object-cover object-center"
              />
            ) : (
              <div
                className="flex aspect-[16/9] w-full items-end bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 px-5 pb-5"
                aria-hidden
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    Fashion Edge
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-white">Visit us</p>
                </div>
              </div>
            )}
          </div>

          <header className="mt-8">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
              Contact
            </p>
            <h1 className="text-foreground mt-2 text-[1.65rem] font-bold uppercase leading-none tracking-[-0.02em]">
              Get in touch
            </h1>
          </header>

          {/* Our stores */}
          <section className="mt-9" aria-labelledby="our-stores-heading">
            <h2
              id="our-stores-heading"
              className="text-foreground text-[13px] font-bold uppercase tracking-[0.14em]"
            >
              Our stores
            </h2>
            <div className="border-border/70 mt-3 border-t" />

            <ul className="mt-5 space-y-7">
              {STORES.map((store) => (
                <li key={store.city}>
                  <p className="text-foreground text-[15px] font-semibold tracking-tight">
                    {store.city}
                  </p>
                  <p className="text-foreground/70 mt-1.5 flex items-start gap-2 text-[13px] leading-relaxed">
                    <MapPin
                      className="text-foreground/45 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span>{store.address}</span>
                  </p>
                  <p className="text-foreground/70 mt-1.5 flex items-center gap-2 text-[13px]">
                    <Clock
                      className="text-foreground/45 size-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span>{store.hours}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Contact us */}
          <section className="mt-10" aria-labelledby="contact-us-heading">
            <h2
              id="contact-us-heading"
              className="text-foreground text-[13px] font-bold uppercase tracking-[0.14em]"
            >
              Contact us
            </h2>
            <div className="border-border/70 mt-3 border-t" />

            <p className="text-muted-foreground mt-4 text-[13px] leading-relaxed">
              Feel free to send us your queries — our team typically replies within one business
              day.
            </p>

            <div className="mt-5 space-y-3 text-[13.5px] leading-relaxed">
              <p>
                <span className="text-foreground font-semibold">Phone: </span>
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className="text-foreground/80 underline-offset-2 hover:underline"
                >
                  {CONTACT_PHONE}
                </a>
              </p>
              <p>
                <span className="text-foreground font-semibold">Support email: </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-foreground/80 break-all underline-offset-2 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMessageOpen(true)}
              className={cn(
                'bg-foreground text-background mt-8 inline-flex min-h-11 items-center justify-center px-8',
                'text-[11px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-90 active:opacity-80',
              )}
            >
              Send a message
            </button>
          </section>
        </div>
      </div>

      <ContactPopup open={messageOpen} onOpenChange={setMessageOpen} />
    </>
  );
}
