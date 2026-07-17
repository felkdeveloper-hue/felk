import { Helmet } from 'react-helmet-async';
import { toJsonLdScript } from '@/lib/seo';

export interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
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
  jsonLd,
}: SeoProps) {
  const resolvedSiteName = siteName ?? 'FE';
  const fullTitle = title ? `${title} | ${resolvedSiteName}` : resolvedSiteName;
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      {image ? <meta property="og:image" content={image} /> : null}
      {url ? <meta property="og:url" content={url} /> : null}
      <meta property="og:site_name" content={resolvedSiteName} />

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {image ? <meta name="twitter:image" content={image} /> : null}

      {url ? <link rel="canonical" href={url} /> : null}

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {toJsonLdScript(item)}
        </script>
      ))}
    </Helmet>
  );
}
