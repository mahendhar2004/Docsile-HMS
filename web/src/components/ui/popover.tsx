import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ─────────────────────────────────────────────
   Uses zoom-in keyframe from index.css for entrance (scale 0.95 →
   1 + fade). Exit reverses it. Scoped to [data-popover-content].
─────────────────────────────────────────────────────────────── */
const POPOVER_ANIMATION_CSS = `
  [data-popover-content][data-state=open] {
    animation: zoom-in var(--duration-macro) var(--ease-spring) both;
  }
  [data-popover-content][data-state=closed] {
    animation: zoom-in var(--duration-micro) var(--ease-fluid) reverse both;
  }
`;

/* ─── Root primitives (pass-through) ────────────────────────── */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

/* ─── Content ───────────────────────────────────────────────── */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <style href="docsile-popover-animations" precedence="component">
      {POPOVER_ANIMATION_CSS}
    </style>
    <PopoverPrimitive.Content
      ref={ref}
      data-popover-content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-[var(--radius-lg)]',
        'bg-[var(--color-popover)] text-[var(--color-popover-foreground)]',
        'border border-[var(--color-border)]',
        'shadow-[var(--shadow-md)] p-4 outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent };
