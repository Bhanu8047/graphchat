import { type ReactNode } from 'react';

type StepTileProps = {
  index: number;
  title: string;
  description: string;
  icon: ReactNode;
};

/**
 * StepTile — used in the "How it works" timeline. Numbers + icon + copy.
 */
export function StepTile({ index, title, description, icon }: StepTileProps) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)]">
          {index}
        </span>
        <span className="text-[var(--primary)]">{icon}</span>
      </div>
      <div>
        <h3 className="font-display text-lg font-medium tracking-tight text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}
