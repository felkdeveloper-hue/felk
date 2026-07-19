import { Link } from '@tanstack/react-router';
import { useCmsPages, useContactInfos, usePublicSettings, useSocialLinks } from '@/hooks/cms';
import { ROUTES, type RoutePath } from '@/constants';
import { cn } from '@/lib/utils';
import { getSetting } from '@/utils/cms';
import { Container } from '@/components/layout/container';
import { Separator } from '@/components/ui/separator';
import { SocialIconLink } from '@/components/storefront/social-icon-link';
import { NewsletterSignupSection } from '@/components/storefront/newsletter-signup';

/** Fashion Edge (fe.lk) public details — used when CMS has not been seeded yet. */
const FE_FALLBACK = {
  storeName: 'FE',
  tagline: 'Modern fashion for every day',
  companyLinks: [
    { label: 'About', href: ROUTES.about },
    { label: 'Contact', href: ROUTES.contact },
    { label: 'Privacy', href: ROUTES.privacy },
    { label: 'Terms', href: ROUTES.terms },
  ] as const,
  socialLinks: [
    { id: 'fb', platform: 'facebook', url: 'https://www.facebook.com/fashionedge.lk/' },
    { id: 'ig', platform: 'instagram', url: 'https://www.instagram.com/fashion__edge__/' },
    { id: 'tt', platform: 'tiktok', url: 'https://www.tiktok.com/@fashion_edge_' },
  ],
  contactInfos: [
    {
      id: 'email',
      label: 'Email',
      type: 'email' as const,
      value: 'support@fe.lk',
    },
    {
      id: 'phone',
      label: 'Hotline',
      type: 'phone' as const,
      value: '081 220 4315',
    },
    {
      id: 'address',
      label: 'Flagship store',
      type: 'address' as const,
      value: 'No. 14, Kotugodella Veediya, Kandy',
    },
  ],
};

export function StorefrontFooter() {
  const { data: settings } = usePublicSettings();
  const { data: pagesResult } = useCmsPages();
  const { data: socialResult } = useSocialLinks();
  const { data: contactResult } = useContactInfos();

  const storeName =
    getSetting<string>(settings, 'store.name') ??
    getSetting<string>(settings, 'storeName') ??
    FE_FALLBACK.storeName;
  const tagline =
    getSetting<string>(settings, 'store.tagline') ??
    getSetting<string>(settings, 'store.description') ??
    FE_FALLBACK.tagline;

  const cmsPages = pagesResult?.data ?? [];
  const companyLinksFromCms = cmsPages
    .filter((page) =>
      (['about', 'contact', 'privacy', 'terms'] as const).includes(
        page.slug as 'about' | 'contact' | 'privacy' | 'terms',
      ),
    )
    .map((page) => ({
      label: page.title,
      href: slugToRoute(page.slug),
    }));

  const companyLinks =
    companyLinksFromCms.length > 0 ? companyLinksFromCms : FE_FALLBACK.companyLinks;

  const socialLinks = socialResult?.data?.length ? socialResult.data : FE_FALLBACK.socialLinks;

  const cmsContacts = contactResult?.data ?? [];
  const settingEmail =
    getSetting<string>(settings, 'contact.email') ?? getSetting<string>(settings, 'contactEmail');
  const contactInfos =
    cmsContacts.length > 0
      ? cmsContacts.slice(0, 4)
      : settingEmail
        ? [{ id: 'setting-email', label: 'Email', type: 'email' as const, value: settingEmail }]
        : FE_FALLBACK.contactInfos;

  return (
    <footer
      data-slot="storefront-footer"
      className="border-border border-t bg-[linear-gradient(180deg,hsl(var(--muted))_0%,hsl(var(--background))_40%)]"
    >
      <div className="border-border/70 border-b">
        <NewsletterSignupSection />
      </div>

      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="col-span-2 space-y-4 lg:col-span-2">
          <Link
            to={ROUTES.home}
            preload="intent"
            className="font-display text-foreground text-3xl font-bold uppercase tracking-tight"
          >
            {storeName}
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">{tagline}</p>

          <div className="flex items-center gap-3 pt-2">
            {socialLinks.map((link) => (
              <SocialIconLink key={link.id} platform={link.platform} url={link.url} />
            ))}
          </div>
        </div>

        <nav aria-label="Company" className="space-y-3">
          <p className="text-foreground text-xs font-medium uppercase tracking-[0.15em]">Company</p>
          <ul className="space-y-2.5">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  preload="intent"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Shop" className="space-y-3">
          <p className="text-foreground text-xs font-medium uppercase tracking-[0.15em]">Shop</p>
          <ul className="space-y-2.5">
            <li>
              <Link
                to={ROUTES.products}
                preload="intent"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                All products
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.categories}
                preload="intent"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.search}
                preload="intent"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Search
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="text-foreground text-xs font-medium uppercase tracking-[0.15em]">Contact</p>
          <ul className="text-muted-foreground space-y-2.5 text-sm">
            {contactInfos.map((info) => (
              <li key={info.id}>
                <span className="text-foreground block text-xs font-medium uppercase tracking-wide">
                  {info.label}
                </span>
                {info.type === 'email' ? (
                  <a href={`mailto:${info.value}`} className="hover:text-foreground">
                    {info.value}
                  </a>
                ) : info.type === 'phone' || info.type === 'whatsapp' ? (
                  <a
                    href={`tel:${info.value.replace(/\s+/g, '')}`}
                    className="hover:text-foreground"
                  >
                    {info.value}
                  </a>
                ) : (
                  info.value
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Separator />

      <Container
        className={cn(
          'text-muted-foreground flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row',
        )}
      >
        <p>
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to={ROUTES.privacy} preload="intent" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to={ROUTES.terms} preload="intent" className="hover:text-foreground">
            Terms
          </Link>
          <a
            href="https://fe.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            fe.lk
          </a>
        </div>
      </Container>
    </footer>
  );
}

function slugToRoute(slug: string): RoutePath {
  switch (slug) {
    case 'about':
      return ROUTES.about;
    case 'contact':
      return ROUTES.contact;
    case 'privacy':
      return ROUTES.privacy;
    case 'terms':
      return ROUTES.terms;
    default:
      return ROUTES.home;
  }
}
