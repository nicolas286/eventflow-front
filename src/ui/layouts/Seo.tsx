// src/ui/seo/Seo.tsx
import { Helmet } from "react-helmet-async";

type SeoProps = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string | null;
  ogUrl?: string;
  robots?: string; // "index,follow" etc
};

export function Seo({
  title,
  description,
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  robots,
}: SeoProps) {
  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {robots ? <meta name="robots" content={robots} /> : null}

      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {/* OpenGraph */}
      {ogTitle ? <meta property="og:title" content={ogTitle} /> : null}
      {ogDescription ? <meta property="og:description" content={ogDescription} /> : null}
      {ogUrl ? <meta property="og:url" content={ogUrl} /> : null}
      <meta property="og:type" content="website" />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}

      {/* Twitter (bonus) */}
      {ogImage ? <meta name="twitter:card" content="summary_large_image" /> : null}
      {ogTitle ? <meta name="twitter:title" content={ogTitle} /> : null}
      {ogDescription ? <meta name="twitter:description" content={ogDescription} /> : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
    </Helmet>
  );
}