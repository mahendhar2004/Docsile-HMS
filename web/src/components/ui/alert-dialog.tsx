import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ─────────────────────────────────────────────
   AlertDialog has no click-outside-to-dismiss — used for
   confirmations that must be explicitly actioned. Shares the same
   entrance/exit keyframes as Dialog.
─────────────────────────────────────────────────────────────── */
const ALERT_ANIMATION_CSS = `
  [data-alert-overlay][data-state=open] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) both;
  }
  [data-alert-overlay][data-state=closed] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) reverse both;
  }
  [data-alert-content][data-state=open] {
    animation: dialog-in var(--duration-macro) var(--ease-spring) both;
  }
  [data-alert-content][data-state=closed] {
    animation: dialog-out var(--duration-micro) var(--ease-fluid) both;
  }
`;

/* ─── Size variants ──────────────────────────────────────────── */
const alertContentVariants = cva(
  [
    'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
    'w-full bg-[var(--color-surface)] rounded-[--radius-lg]',
    'shadow-[--shadow-overlay] p-6 outline-none',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

/* ─── Root primitives (pass-through) ────────────────────────── */
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/* ─── Overlay ───────────────────────────────────────────────── */
const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    data-alert-overlay
    className={cn('fixed inset-0 z-50 bg-black/50', className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

/* ─── Content ───────────────────────────────────────────────── */
export interface AlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>,
    VariantProps<typeof alertContentVariants> {}

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, children, size, ...props }, ref) => (
  <AlertDialogPortal>
    <style href="docsile-alert-dialog-animations" precedence="component">
      {ALERT_ANIMATION_CSS}
    </style>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      data-alert-content
      className={cn(alertContentVariants({ size }), className)}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

/* ─── Layout helpers ─────────────────────────────────────────── */
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 mb-4', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-row justify-end gap-3 mt-6', className)}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

/* ─── Typography helpers ─────────────────────────────────────── */
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-[length:var(--text-subtitle)] font-semibold leading-none tracking-tight',
      'text-[var(--color-foreground)]',
      className,
    )}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-[length:var(--text-body)] text-[var(--color-muted-foreground)] leading-normal',
      className,
    )}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

/* ─── Action / Cancel ────────────────────────────────────────── */
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2',
      'px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)]',
      'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
      'hover:opacity-90 transition-opacity duration-[var(--duration-micro)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2',
      'px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)]',
      'shadow-[--shadow-border]',
      'bg-[var(--color-card)] text-[var(--color-foreground)]',
      'hover:bg-[var(--color-muted)] transition-colors duration-[var(--duration-micro)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
