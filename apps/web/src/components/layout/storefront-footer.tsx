import { Link } from '@tanstack/react-router';
import { useCmsPages, useContactInfos, usePublicSettings, useSocialLinks } from '@/hooks/cms';
import { buildAbsoluteUrl } from '@/config';
import { ROUTES, type RoutePath } from '@/constants';
import { cn } from '@/lib/utils';
import { getSetting } from '@/utils/cms';
import { Container } from '@/components/layout/container';
import { Separator } from '@/components/ui/separator';
import { SocialIconLink } from '@/components/storefront/social-icon-link';

export function StorefrontFooter() {
  const { data: settings } = usePublicSettings();
  const { data: pagesResult } = useCmsPages();
  const { data: socialResult } = useSocialLinks();
  const { data: contactResult } = useContactInfos();

  const storeName =
    getSetting<string>(settings, 'store.name') ?? getSetting<string>(settings, 'storeName') ?? 'FE';
  const tagline =
    getSetting<string>(settings, 'store.tagline') ??
    getSetting<string>(settings, 'store.description') ??
    'Considered clothing, made to last.';

  const cmsPages = pagesResult?.data ?? [];
  const companyLinks = cmsPages.filter((page) =>
    (['contact', 'privacy', 'terms'] as const).includes(
      page.slug as 'contact' | 'privacy' | 'terms',
    ),
  );

  const slugToRoute = (slug: string): RoutePath => {
    switch (slug) {
      case 'contact':
        return ROUTES.contact;
      case 'privacy':
        return ROUTES.privacy;
      case 'terms':
        return ROUTES.terms;
      default:
        return ROUTES.home;
    }
  };
  const socialLinks = socialResult?.data ?? [];
  const contactInfos = contactResult?.data ?? [];
  const primaryContact = contactInfos.find((item) => item.isPrimary) ?? contactInfos[0];

  return (
    <footer
      data-slot="storefront-footer"
      className="border-border border-t bg-[linear-gradient(180deg,hsl(var(--muted))_0%,hsl(var(--background))_40%)]"
    >
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

          {socialLinks.length ? (
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((link) => (
                <SocialIconLink key={link.id} platform={link.platform} url={link.url} />
              ))}
            </div>
          ) : null}
        </div>

        <nav aria-label="Company" className="space-y-3">
          <p className="text-foreground text-xs font-medium uppercase tracking-[0.15em]">Company</p>
          <ul className="space-y-2.5">
            {companyLinks.map((page) => (
              <li key={page.slug}>
                <Link
                  to={slugToRoute(page.slug)}
                  preload="intent"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {page.title}
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
          {contactInfos.length ? (
            <ul className="text-muted-foreground space-y-2.5 text-sm">
              {contactInfos.slice(0, 4).map((info) => (
                <li key={info.id}>
                  <span className="text-foreground block">{info.label}</span>
                  {info.type === 'email' ? (
                    <a href={`mailto:${info.value}`} className="hover:text-foreground">
                      {info.value}
                    </a>
                  ) : info.type === 'phone' ? (
                    <a href={`tel:${info.value}`} className="hover:text-foreground">
                      {info.value}
                    </a>
                  ) : (
                    info.value
                  )}
                </li>
              ))}
            </ul>
          ) : primaryContact ? (
            <p className="text-muted-foreground text-sm">{primaryContact.value}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {getSetting<string>(settings, 'contact.email') ??
                getSetting<string>(settings, 'contactEmail') ??
                'Contact details coming soon'}
            </p>
          )}
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
          <a href={buildAbsoluteUrl('/')} className="hover:text-foreground">
            {buildAbsoluteUrl('/').replace(/^https?:\/\//, '')}
          </a>
        </div>
      </Container>
    </footer>
  );
}
