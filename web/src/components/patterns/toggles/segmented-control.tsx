/**
 * SegmentedControl
 *
 * A pill-group toggle for switching between mutually exclusive modes
 * (e.g. OPD / IPD, Day / Week / Month). Visually distinct from Tabs
 * — this is a value selector, not page navigation.
 *
 * Uses Radix Tabs under the hood for full keyboard navigation and
 * accessible role semantics (tablist / tab / tabpanel), but only
 * exposes the simplified segmented-control API surface.
 *
 * Keyboard: Arrow keys to move between segments, Space/Enter to activate.
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────── */
export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  disabled?: boolean;
}

/* ─── Size variants ──────────────────────────────────────────── */
const triggerVariants = cva(
  [
    'relative z-10 inline-flex items-center justify-center gap-1.5',
    'font-medium whitespace-nowrap select-none',
    'transition-colors duration-[var(--duration-micro)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
    'disabled:pointer-events-none disabled:opacity-40',
    /* active indicator — pill background with shadow */
    'data-[state=active]:bg-[var(--color-surface)]',
    'data-[state=active]:text-[var(--color-foreground)]',
    'data-[state=active]:shadow-[var(--shadow-xs)]',
    /* inactive */
    'text-[var(--color-muted-foreground)]',
    'hover:text-[var(--color-foreground)]',
    'rounded-[var(--radius-sm)]',
  ],
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1 text-[length:var(--text-caption)]',
        md: 'px-3.5 py-1.5 text-[length:var(--text-body)]',
        lg: 'px-4 py-2 text-[length:var(--text-subtitle)]',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

/* ─── Props ──────────────────────────────────────────────────── */
export interface SegmentedControlProps<T extends string = string>
  extends VariantProps<typeof triggerVariants> {
  /** The list of options to display. */
  options: SegmentOption<T>[];
  /** Currently active value. */
  value: T;
  /** Called when the user selects a different segment. */
  onValueChange: (value: T) => void;
  /** Accessible label for the control group. */
  'aria-label'?: string;
  className?: string;
}

/* ─── Component ─────────────────────────────────────────────── */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  size,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      activationMode="manual"
    >
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center gap-1 p-1',
          'bg-[var(--color-muted)] rounded-[var(--radius-lg)]',
          className,
        )}
      >
        {options.map((opt) => (
          <TabsPrimitive.Trigger
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn(triggerVariants({ size }))}
          >
            {opt.icon && (
              <span className="shrink-0" aria-hidden="true">
                {opt.icon}
              </span>
            )}
            {opt.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {/*
        TabsContent is required by Radix for aria-controls correctness.
        We render nothing here — callers render their own content based
        on the `value` prop. The hidden content containers satisfy the
        aria-controls relationship without rendering visible DOM.
      */}
      {options.map((opt) => (
        <TabsPrimitive.Content key={opt.value} value={opt.value} hidden />
      ))}
    </TabsPrimitive.Root>
  );
}
