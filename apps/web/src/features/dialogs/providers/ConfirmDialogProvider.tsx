'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '../../../components/atoms/Button';
import type { ButtonVariantProps } from '../../../components/atoms/buttonStyles';

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of the confirm button. Defaults to "primary". */
  tone?: ButtonVariantProps['tone'];
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type DialogState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * App-wide async confirm dialog. Wrap once near the root and call
 * `useConfirm()` from any client component:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete?', tone: 'danger' })) { ... }
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, resolve });
      }),
    [],
  );

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  // ESC closes; lock body scroll while open; auto-focus confirm button.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <h2
              id="confirm-dialog-title"
              className="font-display text-xl text-[var(--foreground)]"
            >
              {state.title}
            </h2>
            {state.description ? (
              <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                {state.description}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button tone="secondary" onClick={() => close(false)}>
                {state.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                ref={confirmButtonRef}
                tone={state.tone ?? 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmDialogProvider>');
  }
  return ctx;
}
