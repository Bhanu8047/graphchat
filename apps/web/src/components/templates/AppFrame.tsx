'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Surface } from '../atoms/Surface';
import { AppHeader } from '../organisms/AppHeader';
import { AppSidebar } from '../organisms/AppSidebar';
import { NavCard } from '../molecules/NavCard';
import { navItems } from '../../features/navigation/config/nav-items';
import { useAuth } from '../../features/auth/providers/AuthProvider';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const currentItem =
    navItems.find((item) => item.href === pathname) ?? navItems[0];
  const quickItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-3 py-3 sm:px-4 lg:gap-6 lg:px-6 lg:py-4">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <AppSidebar currentPath={pathname} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="sticky top-3 z-30">
            <AppHeader
              currentItem={currentItem}
              quickItems={quickItems}
              currentPath={pathname}
              onOpenMenu={() => setMobileNavOpen(true)}
            />
          </div>
          <main className="min-h-[calc(100vh-10rem)]">{children}</main>
        </div>
      </div>
      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute inset-y-3 right-3 w-[min(88vw,360px)] overflow-y-auto"
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <Surface tone="elevated" padding="lg" className="h-full">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge tone="accent">Navigation</Badge>
                    <div className="mt-3 font-display text-2xl text-slate-900 dark:text-white">
                      {user?.name?.split(' ')[0] ?? 'Workspace'}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {user?.email}
                    </div>
                  </div>
                  <Button tone="ghost" onClick={() => setMobileNavOpen(false)}>
                    Close
                  </Button>
                </div>
                <nav className="mt-6 space-y-2">
                  {navItems.map((item) => (
                    <NavCard
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                    />
                  ))}
                </nav>
              </Surface>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
