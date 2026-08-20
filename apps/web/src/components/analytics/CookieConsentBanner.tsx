import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { getCookieConsent, setCookieConsent } from '@/lib/analytics/consent';
import { captureAttribution } from '@/lib/analytics/attribution';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    captureAttribution();
    setVisible(!getCookieConsent());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    captureAttribution();
    setCookieConsent({ analytics: true, marketing: true });
    setVisible(false);
  };

  return (
    <div
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-[80] border-t px-4 py-4 backdrop-blur-md sm:px-6"
      role="status"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-copy"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <p id="cookie-consent-title" className="text-sm font-semibold">
            How you found us
          </p>
          <p id="cookie-consent-copy" className="text-muted-foreground text-sm leading-relaxed">
            We measure visits, ads (Facebook, Instagram, Google), device, and country so orders show
            the right source. This uses first-party cookies on fe.lk.{' '}
            <Link to={ROUTES.privacy} className="text-foreground underline underline-offset-4">
              Privacy policy
            </Link>
          </p>
        </div>
        <Button type="button" size="sm" className="shrink-0" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
