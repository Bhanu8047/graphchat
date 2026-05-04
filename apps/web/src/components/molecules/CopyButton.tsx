'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../atoms/Button';
import type { ButtonVariantProps } from '../atoms/buttonStyles';

type CopyButtonProps = {
  /** The text to write to the clipboard when clicked. */
  value: string;
  /** Label for the idle state. Defaults to "Copy". */
  label?: string;
  /** Label briefly shown after a successful copy. Defaults to "Copied". */
  copiedLabel?: string;
  /** How long (ms) to show the copied state before reverting. */
  resetMs?: number;
  className?: string;
} & Pick<ButtonVariantProps, 'tone' | 'size'>;

/**
 * Reusable clipboard copy button.
 *
 * - Uses navigator.clipboard when available, falling back to a hidden textarea
 *   for older browsers / non-secure contexts.
 * - Shows transient "Copied" feedback and then resets.
 * - Single responsibility: copying text. Compose with surrounding markup.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  resetMs = 1500,
  tone = 'secondary',
  size,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
    } catch {
      setCopied(false);
    }
  }, [value, resetMs]);

  return (
    <Button
      type="button"
      tone={tone}
      size={size}
      onClick={copy}
      aria-live="polite"
      className={className}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
