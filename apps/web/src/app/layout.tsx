import './globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/providers/AuthProvider';
import { ConfirmDialogProvider } from '../features/dialogs/providers/ConfirmDialogProvider';
import { ThemeProvider } from '../features/theme/providers/ThemeProvider';
import { themeInitScript } from '../features/theme/themeInitScript';

export const metadata = {
  title: 'trchat',
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
          <ThemeProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
