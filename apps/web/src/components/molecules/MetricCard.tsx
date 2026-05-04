import { Surface } from '../atoms/Surface';

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Surface tone="soft" padding="md">
      <div className="text-sm text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-3 font-display text-4xl text-[var(--foreground)]">
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--muted-foreground)]/80">
        {hint}
      </div>
    </Surface>
  );
}
