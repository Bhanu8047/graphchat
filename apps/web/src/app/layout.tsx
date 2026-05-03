import './globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import {
  ThemeProvider,
  themeInitScript,
} from '../features/theme/providers/ThemeProvider';

export const metadata = {
  title: 'VectorGraph',
  description: 'Repository context graph for AI agents',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
