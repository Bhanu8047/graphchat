import './globals.css';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import {
  ThemeProvider,
  themeInitScript,
} from '../features/theme/providers/ThemeProvider';

export const metadata = {
  title: 'VectorGraph',
  description: 'Repository context graph for AI agents',
};

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});
const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
