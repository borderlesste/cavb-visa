import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noIndex?: boolean;
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = 'CAVB IOM Haiti - Brazil Visa Application System',
  description = 'Official visa application system for Brazilian visas in Haiti. Apply for VITEM-III and VITEM-XI visas through the International Organization for Migration (IOM) Haiti.',
  keywords = 'Brazil visa, Haiti, IOM, VITEM-III, VITEM-XI, visa application, International Organization for Migration, CAVB',
  image = 'https://cavb-visa.iom.org/og-image.jpg',
  url = 'https://cavb-visa.iom.org/',
  type = 'website',
  noIndex = false,
  structuredData
}) => {
  const fullTitle = title === 'CAVB IOM Haiti - Brazil Visa Application System' 
    ? title 
    : `${title} | CAVB IOM Haiti`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="CAVB IOM Haiti" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Language alternatives */}
      <link rel="alternate" hrefLang="en" href={`${url}?lang=en`} />
      <link rel="alternate" hrefLang="fr" href={`${url}?lang=fr`} />
      <link rel="alternate" hrefLang="ht" href={`${url}?lang=ht`} />
      <link rel="alternate" hrefLang="x-default" href={url} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

// Pre-defined SEO configurations for different pages
export const AuthPageSEO = () => (
  <SEO
    title="Login & Register"
    description="Access your Brazil visa application account or create a new one. Secure authentication for CAVB IOM Haiti visa services."
    url="https://cavb-visa.iom.org/auth"
    keywords="login, register, Brazil visa account, IOM Haiti, CAVB authentication"
  />
);

export const DashboardSEO = () => (
  <SEO
    title="Application Dashboard"
    description="Track your Brazil visa application status, upload documents, and manage your visa process through IOM Haiti."
    url="https://cavb-visa.iom.org/dashboard"
    keywords="visa dashboard, application status, document upload, Brazil visa tracking"
    noIndex={true} // Private area
  />
);

export const ProfileSEO = () => (
  <SEO
    title="User Profile"
    description="Manage your profile information for your Brazil visa application through CAVB IOM Haiti."
    url="https://cavb-visa.iom.org/profile"
    keywords="user profile, account settings, personal information, visa application"
    noIndex={true} // Private area
  />
);

export const AdminSEO = () => (
  <SEO
    title="Admin Dashboard"
    description="Administrative interface for managing Brazil visa applications through CAVB IOM Haiti."
    url="https://cavb-visa.iom.org/admin"
    keywords="admin dashboard, visa management, IOM Haiti administration"
    noIndex={true} // Private admin area
  />
);

// Structured Data Templates
export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "GovernmentOrganization",
  "name": "International Organization for Migration (IOM) Haiti",
  "alternateName": "CAVB IOM Haiti",
  "description": "Official center for Brazil visa applications in Haiti",
  "url": "https://cavb-visa.iom.org",
  "logo": "https://cavb-visa.iom.org/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+509-XXXX-XXXX",
    "contactType": "customer service",
    "availableLanguage": ["English", "French", "Haitian Creole"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "HT",
    "addressRegion": "Haiti"
  },
  "sameAs": [
    "https://www.iom.int/countries/haiti"
  ]
};

export const serviceStructuredData = {
  "@context": "https://schema.org",
  "@type": "GovernmentService",
  "name": "Brazil Visa Application Service",
  "description": "Official processing of VITEM-III and VITEM-XI visa applications for travel to Brazil",
  "provider": organizationStructuredData,
  "serviceType": "Visa Processing",
  "areaServed": {
    "@type": "Country",
    "name": "Haiti"
  },
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": "https://cavb-visa.iom.org",
    "availableLanguage": ["English", "French", "Haitian Creole"]
  }
};

export default SEO;