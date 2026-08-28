import { Helmet } from 'react-helmet-async';
import { buildAbsoluteUrl, formatSeoTitle, siteConfig } from '@/config';
import { FE_SEO_KEYWORDS, toJsonLdScript } from '@/lib/seo';

export interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: object | object[];
}

export function Seo({
  title,
  description,
  image,
  url,
  siteName,
  type = 'website',
  noIndex = false,
  keywords = FE_SEO_KEYWORDS,
  jsonLd,
}: SeoProps) {
  const resolvedSiteName = siteName ?? siteConfig.name;
  const fullTitle = formatSeoTitle(title);
  const resolvedDescription = description ?? siteConfig.defaultDescription;
  const resolvedImage = image ?? buildAbsoluteUrl(siteConfig.defaultOgImagePath);
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
      {!noIndex ? <meta name="robots" content="index, follow, max-image-preview:large" /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:alt" content={`${siteConfig.name} (${siteConfig.shortName}) logo`} />
      {resolvedImage.endsWith('/og-image.png') || resolvedImage.endsWith('og-image.png') ? (
        <>
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:type" content="image/png" />
        </>
      ) : null}
      {url ? <meta property="og:url" content={url} /> : null}
      <meta property="og:site_name" content={resolvedSiteName} />
      <meta property="og:locale" content="en_LK" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />

      {url ? <link rel="canonical" href={url} /> : null}

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {toJsonLdScript(item)}
        </script>
      ))}
    </Helmet>
  );
}
