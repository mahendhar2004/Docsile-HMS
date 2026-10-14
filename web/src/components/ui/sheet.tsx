import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ─────────────────────────────────────────────
   Sheet uses slide animations per side. CSS data-state selectors
   let Radix wait for exit animation before unmounting.
─────────────────────────────────────────────────────────────── */
const SHEET_ANIMATION_CSS = `
  [data-sheet-overlay][data-state=open] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) both;
  }
  [data-sheet-overlay][data-state=closed] {
    animation: overlay-in var(--duration-micro) var(--ease-micro) reverse both;
  }
  [data-sheet-content][data-side=right][data-state=open] {
    animation: sheet-in-right var(--duration-macro-lg) var(--ease-spring) both;
  }
  [data-sheet-content][data-side=right][data-state=closed] {
    animation: sheet-out-right var(--duration-macro) var(--ease-fluid) both;
  }
  [data-sheet-content][data-side=left][data-state=open] {
    animation: sheet-in-left var(--duration-macro-lg) var(--ease-spring) both;
  }
  [data-sheet-content][data-side=left][data-state=closed] {
    animation: sheet-out-left var(--duration-macro) var(--ease-fluid) both;
  }
`;

/* ─── Size variants ──────────────────────────────────────────── */
const sheetContentVariants = cva(
  [
    'fixed z-50 h-full bg-[var(--color-surface)]',
    'shadow-[var(--shadow-overlay)] outline-none flex flex-col',
  ],
  {
    variants: {
      side: {
        right: 'right-0 top-0',
        left: 'left-0 top-0',
      },
      size: {
        sm: 'w-80',
        md: 'w-96',
        lg: 'w-[32rem]',
      },
    },
    defaultVariants: {
      side: 'right',
      size: 'md',
    },
  }
);

/* ─── Root primitives (pass-through — Sheet is Dialog under the hood) */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

/* ─── Overlay ───────────────────────────────────────────────── */
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-sheet-overlay
    className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className)}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

/* ─── Content ───────────────────────────────────────────────── */
export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = 'right', size, ...props }, ref) => (
  <SheetPortal>
    <style href="docsile-sheet-animations" precedence="component">
      {SHEET_ANIMATION_CSS}
    </style>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-sheet-content
      data-side={side}
      className={cn(sheetContentVariants({ side, size }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Close panel"
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
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

/* ─── Layout helpers ─────────────────────────────────────────── */
const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1 px-6 py-5 border-b border-[var(--color-border)]', className)}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-auto px-6 py-5', className)} {...props} />
);
SheetBody.displayName = 'SheetBody';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-row justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]',
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

/* ─── Typography helpers ─────────────────────────────────────── */
const SheetTitle = React.forwardRef<
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
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
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
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
