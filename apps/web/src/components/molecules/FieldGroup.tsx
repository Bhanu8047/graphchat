import { type ReactNode } from 'react';

type FieldGroupProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function FieldGroup({ label, children, hint }: FieldGroupProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-2 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
