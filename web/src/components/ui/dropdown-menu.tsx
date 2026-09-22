import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Animation CSS ─────────────────────────────────────────────
   Dropdown uses slide-in-from-top for entrance (quick, feels
   contextual to where the trigger is). Scoped to [data-dropdown-content].
─────────────────────────────────────────────────────────────── */
const DROPDOWN_ANIMATION_CSS = `
  [data-dropdown-content][data-state=open] {
    animation: slide-in-from-top var(--duration-macro) var(--ease-spring) both;
  }
  [data-dropdown-content][data-state=closed] {
    animation: slide-in-from-top var(--duration-micro) var(--ease-fluid) reverse both;
  }
  [data-dropdown-subcontent][data-state=open] {
    animation: slide-in-from-right var(--duration-macro) var(--ease-spring) both;
  }
  [data-dropdown-subcontent][data-state=closed] {
    animation: slide-in-from-right var(--duration-micro) var(--ease-fluid) reverse both;
  }
`;

/* ─── Shared class strings ───────────────────────────────────── */
const itemBase = cn(
  'relative flex cursor-default select-none items-center gap-2',
  'rounded-[var(--radius-xs)] px-2.5 py-1.5',
  'text-[length:var(--text-body)] text-[var(--color-foreground)]',
  'outline-none transition-colors duration-[var(--duration-micro)]',
  'focus:bg-[var(--color-muted)] focus:text-[var(--color-foreground)]',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
);

/* ─── Root primitives (pass-through) ────────────────────────── */
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/* ─── Content ───────────────────────────────────────────────── */
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  // See ui/popover.tsx for why <style> must be a sibling of Portal, not a
  // child alongside Content — DropdownMenuPortal has the same single-child
  // asChild Slot internally (it's built on @radix-ui/react-menu).
  <>
    <style href="docsile-dropdown-animations" precedence="component">
      {DROPDOWN_ANIMATION_CSS}
    </style>
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        data-dropdown-content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[9rem] overflow-hidden rounded-[var(--radius-md)]',
          'bg-[var(--color-popover)] text-[var(--color-popover-foreground)]',
          'shadow-[var(--shadow-popover)] p-1 outline-none',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  </>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

/* ─── Item ──────────────────────────────────────────────────── */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    /** Renders the item in a destructive (red) accent style. */
    destructive?: boolean;
  }
>(({ className, destructive = false, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      itemBase,
      destructive && 'text-[var(--color-error)] focus:bg-[var(--color-error-soft)] focus:text-[var(--color-error)]',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

/* ─── CheckboxItem ──────────────────────────────────────────── */
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(itemBase, 'pl-8', className)}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

/* ─── RadioItem ─────────────────────────────────────────────── */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(itemBase, 'pl-8', className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

/* ─── Label ─────────────────────────────────────────────────── */
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2.5 py-1.5 text-[length:var(--text-caption)] font-semibold',
      'text-[var(--color-muted-foreground)] uppercase tracking-wide',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

/* ─── Separator ─────────────────────────────────────────────── */
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--color-border)]', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

/* ─── SubTrigger ─────────────────────────────────────────────── */
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(itemBase, 'data-[state=open]:bg-[var(--color-muted)]', inset && 'pl-8', className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

/* ─── SubContent ─────────────────────────────────────────────── */
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    data-dropdown-subcontent
    className={cn(
      'z-50 min-w-[9rem] overflow-hidden rounded-[var(--radius-md)]',
      'bg-[var(--color-popover)] text-[var(--color-popover-foreground)]',
      'shadow-[var(--shadow-popover)] p-1 outline-none',
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

/* ─── Keyboard shortcut hint ────────────────────────────────── */
const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'ml-auto text-[length:var(--text-caption)] text-[var(--color-muted-foreground)] tracking-widest',
      className,
    )}
    {...props}
  />
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
};
