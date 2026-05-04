import { Surface } from '../atoms/Surface';

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Surface
      tone="default"
      padding="md"
      className="border-dashed text-sm text-[var(--muted-foreground)] shadow-none"
    >
      {message}
    </Surface>
  );
}
