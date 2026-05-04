import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Shared variant config — DRY source of truth reused by Button, link buttons,
 * and any other surface that needs the same visual contract (Open/Closed).
 *
 * Lives in its own server-safe module so server components (e.g. the
 * marketing landing page) can compose it via `<Link className={buttonStyles(...)}>`.
 */
export const buttonStyles = tv({
  base: 'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60',
  variants: {
    tone: {
      primary:
        'gradient-cta px-5 py-3 text-white shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--color-space-indigo-700)_70%,transparent)] hover:brightness-110 active:brightness-95',
      accent:
        'bg-[var(--accent)] px-5 py-3 text-[var(--accent-foreground)] hover:brightness-110 active:brightness-95',
      secondary:
        'border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]',
      ghost:
        'px-3 py-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
      danger:
        'bg-[var(--danger)] px-5 py-3 text-[var(--danger-foreground)] hover:brightness-110 active:brightness-95',
    },
    size: {
      sm: 'text-sm px-3 py-2',
      md: 'text-sm',
      lg: 'px-6 py-3.5 text-base',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'primary',
    size: 'md',
    fullWidth: false,
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonStyles>;
