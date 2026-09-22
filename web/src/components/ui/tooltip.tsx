import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ─────────────────────────────────────────────
   Tooltip uses fade-in for entrance (quick, ~micro duration).
   Exit reverses it. Scoped to [data-tooltip-content].
─────────────────────────────────────────────────────────────── */
const TOOLTIP_ANIMATION_CSS = `
  [data-tooltip-content][data-state=delayed-open],
  [data-tooltip-content][data-state=instant-open] {
    animation: fade-in var(--duration-micro) var(--ease-micro) both;
  }
  [data-tooltip-content][data-state=closed] {
    animation: fade-in var(--duration-micro) var(--ease-micro) reverse both;
  }
`;

/* ─── Provider wrapper ──────────────────────────────────────── */
const TooltipProvider = TooltipPrimitive.Provider;

/* ─── Root primitives (pass-through) ────────────────────────── */
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/* ─── Content ───────────────────────────────────────────────── */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  // See popover.tsx for why <style> must be a sibling of Portal, not a
  // child alongside Content — TooltipPortal has the same single-child
  // asChild Slot internally.
  <>
    <style href="docsile-tooltip-animations" precedence="component">
      {TOOLTIP_ANIMATION_CSS}
    </style>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-tooltip-content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-[var(--radius-sm)]',
          'bg-[var(--color-foreground)] text-[var(--color-surface)]',
          'px-3 py-1.5 text-[length:var(--text-caption)] font-medium',
          'shadow-[var(--shadow-popover)]',
          'select-none',
          className,
        )}
        {...props}
      >
        {props.children}
        <TooltipPrimitive.Arrow
          className="fill-[var(--color-foreground)]"
          width={10}
          height={5}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </>
));
TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
