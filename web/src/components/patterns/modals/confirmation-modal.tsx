/**
 * ConfirmationModal
 *
 * A purpose-built modal for actions that require user confirmation.
 * Built on AlertDialog (Radix) — no click-outside-to-dismiss, full
 * focus trapping, and Escape-to-cancel.
 *
 * Three semantic variants each carry a distinct icon + accent color:
 *   - default   → Info icon, primary blue — for neutral confirmations
 *   - destructive → AlertTriangle icon, red  — for deletions / irreversible ops
 *   - warning   → AlertTriangle icon, amber — for risky but reversible ops
 */
import * as React from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  type AlertDialogContentProps,
} from '@/components/ui/alert-dialog';

/* ─── Types ──────────────────────────────────────────────────── */
export type ConfirmationVariant = 'default' | 'destructive' | 'warning';

export interface ConfirmationModalProps {
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visual/semantic variant. */
  variant?: ConfirmationVariant;
  /** Dialog size. */
  size?: AlertDialogContentProps['size'];
  /** Modal title text. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Label for the confirm action button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Called when the user clicks the confirm button. May be async. */
  onConfirm: () => void | Promise<void>;
  /** Pass true while the async action initiated by onConfirm is in flight. */
  isLoading?: boolean;
}

/* ─── Per-variant config ─────────────────────────────────────── */
const variantConfig: Record<
  ConfirmationVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    actionClass: string;
  }
> = {
  default: {
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
    iconBg: 'bg-[var(--color-info-soft)]',
    iconColor: 'text-[var(--color-info-soft-foreground)]',
    actionClass: cn(
      'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
      'hover:opacity-90',
    ),
  },
  destructive: {
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    iconBg: 'bg-[var(--color-error-soft)]',
    iconColor: 'text-[var(--color-error-soft-foreground)]',
    actionClass: cn(
      'bg-[var(--color-error)] text-[var(--color-error-foreground)]',
      'hover:opacity-90',
    ),
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    iconBg: 'bg-[var(--color-warning-soft)]',
    iconColor: 'text-[var(--color-warning-soft-foreground)]',
    actionClass: cn(
      'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
      'hover:opacity-90',
    ),
  },
};

/* ─── Component ─────────────────────────────────────────────── */
export function ConfirmationModal({
  open,
  onOpenChange,
  variant = 'default',
  size = 'sm',
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isLoading = false,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];

  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          {/* Icon badge */}
          <div
            className={cn(
              'mb-3 flex h-10 w-10 items-center justify-center rounded-[--radius-lg]',
              config.iconBg,
              config.iconColor,
            )}
            aria-hidden="true"
          >
            {config.icon}
          </div>

          <AlertDialogTitle>{title}</AlertDialogTitle>

          {description && (
            <AlertDialogDescription className="mt-1">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2',
              'px-4 py-2 text-[length:var(--text-body)] font-medium rounded-[--radius-sm]',
              'shadow-[--shadow-card]',
              'transition-opacity duration-[--duration-micro]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]',
              'disabled:pointer-events-none disabled:opacity-50',
              config.actionClass,
            )}
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isLoading ? 'Please wait…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
