import { type ReactNode } from 'react';
import { Surface } from '../atoms/Surface';

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

/**
 * FeatureCard — composed of the Surface atom + an Icon slot.
 * Hover lifts with a soft space-indigo glow.
 */
export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Surface
      tone="default"
      padding="lg"
      className="group transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--color-space-indigo-400)_55%,transparent)]"
    >
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] transition group-hover:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg font-medium tracking-tight text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </Surface>
  );
}
