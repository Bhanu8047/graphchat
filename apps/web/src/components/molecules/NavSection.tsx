'use client';

import { motion } from 'motion/react';
import type { NavigationItem } from '../../features/navigation/config/nav-items';
import { staggered } from '../../lib/motion-presets';
import { NavLink } from './NavLink';

type NavSectionProps = {
  label: string;
  items: readonly NavigationItem[];
  baseIndex?: number;
  onNavigate?: () => void;
};

export function NavSection({
  label,
  items,
  baseIndex = 0,
  onNavigate,
}: NavSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]/80">
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item, idx) => (
          <motion.div key={item.href} {...staggered(baseIndex + idx)}>
            <NavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              onNavigate={onNavigate}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
