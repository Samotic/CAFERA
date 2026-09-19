import type { Metadata, Viewport } from 'next';
import { ThemeScript } from '@/components/theme/ThemeScript';
import { SITE } from '@/lib/constants/site';
import { fontVariables } from '@/theme/fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Page titles read "Cappuccino · CAFERA" without each page repeating the brand.
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    locale: SITE.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /* No maximumScale and no user-scalable=no: pinch zoom is an accessibility
     requirement, and the layout is verified at 200% zoom instead. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#171009' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      /* The theme script mutates <html> before hydration; React must be told
         that the server and client attribute sets are expected to differ. */
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={fontVariables}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-page text-text min-h-dvh antialiased">
        <a href="#main" className="skip-link sr-only">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
