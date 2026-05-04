import { type ReactNode } from 'react';

type FieldGroupProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function FieldGroup({ label, children, hint }: FieldGroupProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-2 block text-xs text-[var(--muted-foreground)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
