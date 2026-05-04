'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRightIcon } from '../atoms/Icon';
import { Surface } from '../atoms/Surface';
import { DetailDrawer } from './DetailDrawer';
import { cn } from '../../lib/ui';

type TechBadge = {
  label: string;
  tone?: 'indigo' | 'teal' | 'rose' | 'amber' | 'neutral';
};

type CapabilityCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  detail: ReactNode;
  badges?: TechBadge[];
};

const badgeTone: Record<NonNullable<TechBadge['tone']>, string> = {
  indigo:
    'bg-[color-mix(in_oklab,var(--color-space-indigo-400)_12%,transparent)] text-[var(--color-space-indigo-600)] border-[color-mix(in_oklab,var(--color-space-indigo-400)_25%,transparent)]',
  teal: 'bg-[color-mix(in_oklab,var(--color-dusty-olive-400)_12%,transparent)] text-[var(--color-dusty-olive-600)] border-[color-mix(in_oklab,var(--color-dusty-olive-400)_25%,transparent)]',
  rose: 'bg-[color-mix(in_oklab,var(--color-berry-crush-400)_10%,transparent)] text-[var(--color-berry-crush-600)] border-[color-mix(in_oklab,var(--color-berry-crush-400)_22%,transparent)]',
  amber:
    'bg-[color-mix(in_oklab,var(--color-rosy-taupe-400)_12%,transparent)] text-[var(--color-rosy-taupe-700)] border-[color-mix(in_oklab,var(--color-rosy-taupe-400)_25%,transparent)]',
  neutral:
    'bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] text-[var(--muted-foreground)] border-[var(--border)]',
};

function BadgePill({ label, tone = 'neutral' }: TechBadge) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[0.68rem] font-medium tracking-tight',
        badgeTone[tone],
      )}
    >
      {label}
    </span>
  );
}

export function CapabilityCard({
  icon,
  title,
  description,
  detail,
  badges = [],
}: CapabilityCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Surface
        tone="default"
        padding="lg"
        className="group flex flex-col transition duration-300 hover:border-[var(--border-strong)] hover:shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--color-space-indigo-400)_40%,transparent)]"
      >
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] transition group-hover:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-medium tracking-tight text-[var(--foreground)]">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <BadgePill key={b.label} {...b} />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 flex items-center gap-1.5 self-start text-xs font-medium text-[var(--primary)] transition hover:gap-2.5 hover:opacity-80"
        >
          Read more
          <ArrowRightIcon className="h-3.5 w-3.5 transition-all" />
        </button>
      </Surface>

      <DetailDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        badges={
          badges.length > 0 ? (
            <>
              {badges.map((b) => (
                <BadgePill key={b.label} {...b} />
              ))}
            </>
          ) : undefined
        }
      >
        {detail}
      </DetailDrawer>
    </>
  );
}
