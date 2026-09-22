import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ──────────────────────────────────────────
   Injected once via React 19's style hoisting. Radix waits for
   animationend on data-state=closed before unmounting, giving us
   free entrance + exit animations without forceMount hacks.
─────────────────────────────────────────────────────────────── */
const DIALOG_ANIMATION_CSS = `
  [data-dialog-overlay][data-state=open] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) both;
  }
  [data-dialog-overlay][data-state=closed] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) reverse both;
  }
  [data-dialog-content][data-state=open] {
    animation: dialog-in var(--duration-macro) var(--ease-spring) both;
  }
  [data-dialog-content][data-state=closed] {
    animation: dialog-out var(--duration-micro) var(--ease-fluid) both;
  }
`;

/* ─── Size variants ──────────────────────────────────────────── */
const dialogContentVariants = cva(
  [
    'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
    'w-full bg-[var(--color-surface)] rounded-[var(--radius-lg)]',
    'shadow-[var(--shadow-overlay)] p-6 outline-none',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        fullscreen: 'max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] flex flex-col overflow-hidden',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

/* ─── Root primitives (pass-through) ────────────────────────── */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

/* ─── Overlay ───────────────────────────────────────────────── */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-dialog-overlay
    className={cn('fixed inset-0 z-50 bg-black/50', className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

/* ─── Content ───────────────────────────────────────────────── */
export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Hide the default X close button (useful when the consumer provides its own footer action). */
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size, hideCloseButton = false, ...props }, ref) => (
  <DialogPortal>
    {/* React 19 hoists <style> with href+precedence to <head> and deduplicates */}
    <style href="docsile-dialog-animations" precedence="component">
      {DIALOG_ANIMATION_CSS}
    </style>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-dialog-content
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className={cn(
            'absolute right-4 top-4 p-1.5 rounded-[var(--radius-sm)]',
            'text-[var(--color-muted-foreground)]',
            'hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
            'transition-colors duration-[var(--duration-micro)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            'disabled:pointer-events-none',
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

/* ─── Layout helpers ─────────────────────────────────────────── */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 mb-4', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-auto', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-row justify-end gap-3 mt-6', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

/* ─── Typography helpers ─────────────────────────────────────── */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-[length:var(--text-subtitle)] font-semibold leading-none tracking-tight',
      'text-[var(--color-foreground)]',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-[length:var(--text-body)] text-[var(--color-muted-foreground)] leading-normal',
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
