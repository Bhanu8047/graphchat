import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import { ConfirmDialogProvider } from '../features/dialogs/providers/ConfirmDialogProvider';
import { ThemeProvider } from '../features/theme/providers/ThemeProvider';
import { themeInitScript } from '../features/theme/themeInitScript';
import { getSiteUrl } from '../lib/seo';

const siteDescription =
  'Build, store, and query branch-specific repository graphs so AI agents get structured context instead of raw repository dumps.';

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  themeColor: '#0b1220',
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'graphchat',
  description: siteDescription,
  applicationName: 'graphchat',
  keywords: [
    'repository graph',
    'code graph',
    'AI agent context',
    'developer tools',
    'semantic code search',
    'knowledge graph',
  ],
  alternates: {
    canonical: './',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.png'],
    apple: [{ url: '/logo.png', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/logo.svg', color: '#0b1220' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: './',
    siteName: 'graphchat',
    title: 'graphchat',
    description: siteDescription,
    images: [
      {
        url: '/logo.png',
        alt: 'graphchat logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'graphchat',
    description: siteDescription,
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'developer tools',
  other: {
    'msapplication-config': '/browserconfig.xml',
    'msapplication-TileColor': '#0b1220',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
