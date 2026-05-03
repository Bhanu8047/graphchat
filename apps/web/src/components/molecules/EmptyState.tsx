import { Surface } from '../atoms/Surface';

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Surface
      tone="default"
      padding="md"
      className="border-dashed text-sm text-slate-500 dark:text-slate-500"
    >
      {message}
    </Surface>
  );
}
