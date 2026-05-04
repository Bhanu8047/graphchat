import { type ReactNode } from 'react';
import { cn } from '../../lib/ui';

type StepTileTone = 'indigo' | 'teal' | 'rose';

type StepTileProps = {
  title: string;
  description: string;
  icon: ReactNode;
  tone?: StepTileTone;
};

const toneStyles: Record<StepTileTone, string> = {
  indigo:
    'bg-[linear-gradient(135deg,var(--color-space-indigo-400),var(--color-space-indigo-600))] shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--color-space-indigo-600)_55%,transparent)]',
  teal: 'bg-[linear-gradient(135deg,var(--color-space-indigo-300),var(--color-dusty-olive-400))] shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--color-dusty-olive-500)_45%,transparent)]',
  rose: 'bg-[linear-gradient(135deg,var(--color-berry-crush-300),var(--color-rosy-taupe-300))] shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--color-berry-crush-400)_45%,transparent)]',
};

export function StepTile({
  title,
  description,
  icon,
  tone = 'indigo',
}: StepTileProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div
        className={cn(
          'flex h-20 w-20 items-center justify-center rounded-[1.4rem] text-white',
          toneStyles[tone],
        )}
      >
        <span className="[&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[1.5]">
          {icon}
        </span>
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-[22ch] text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}
