import { Surface } from '../atoms/Surface';

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Surface tone="soft" padding="md">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-3 font-display text-4xl text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-slate-500">{hint}</div>
    </Surface>
  );
}
