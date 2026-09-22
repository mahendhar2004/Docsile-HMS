import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── List (tab bar) variants ────────────────────────────────── */
const tabsListVariants = cva('flex', {
  variants: {
    variant: {
      // A muted background strip + inset top padding gives the tab bar its
      // own visual footprint (like a browser/VS Code tab strip) instead of
      // bare text with a hairline underneath — the active tab then "docks"
      // into this strip with a filled surface + rounded top corners.
      underline: [
        'gap-1 rounded-t-[var(--radius-md)] px-1.5 pt-1.5',
        'bg-[var(--color-muted)]/50 border-b border-[var(--color-border)]',
      ],
      pill: [
        'gap-1 p-1 rounded-[var(--radius-lg)]',
        'bg-[var(--color-muted)]',
      ],
      vertical: [
        'flex-col gap-1 items-start',
      ],
    },
  },
  defaultVariants: { variant: 'underline' },
});

/* ─── Trigger (individual tab) variants ─────────────────────── */
const tabsTriggerVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'text-[length:var(--text-body)] font-medium',
    'transition-all duration-[var(--duration-micro)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        underline: [
          'px-3.5 py-2 -mb-px rounded-t-[var(--radius-sm)] border-b-2 border-transparent',
          'text-[var(--color-muted-foreground)]',
          'hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]/60',
          'data-[state=active]:bg-[var(--color-surface)] data-[state=active]:shadow-[--shadow-xs]',
          'data-[state=active]:border-[var(--color-primary)]',
          'data-[state=active]:text-[var(--color-primary)]',
          'data-[state=active]:font-semibold',
        ],
        pill: [
          'flex-1 px-3 py-1.5 rounded-[var(--radius-sm)]',
          'text-[var(--color-muted-foreground)]',
          'hover:text-[var(--color-foreground)]',
          'data-[state=active]:bg-[var(--color-surface)]',
          'data-[state=active]:text-[var(--color-foreground)]',
          'data-[state=active]:shadow-[var(--shadow-xs)]',
        ],
        vertical: [
          'w-full justify-start px-3 py-2 rounded-[var(--radius-sm)]',
          'text-[var(--color-muted-foreground)]',
          'hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
          'data-[state=active]:bg-[var(--color-accent)]',
          'data-[state=active]:text-[var(--color-accent-foreground)]',
          'data-[state=active]:font-medium',
        ],
      },
    },
    defaultVariants: { variant: 'underline' },
  }
);

/* ─── Composable context for variant propagation ─────────────── */
type TabsVariant = 'underline' | 'pill' | 'vertical';

const TabsVariantContext = React.createContext<TabsVariant>('underline');

/* ─── Tabs root ─────────────────────────────────────────────── */
export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    VariantProps<typeof tabsListVariants> {
  variant?: TabsVariant;
}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ variant = 'underline', className, ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root
        ref={ref}
        className={cn(variant === 'vertical' && 'flex gap-6', className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
);
Tabs.displayName = 'Tabs';

/* ─── TabsList ──────────────────────────────────────────────── */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
});
TabsList.displayName = 'TabsList';

/* ─── TabsTrigger ───────────────────────────────────────────── */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

/* ─── TabsContent ───────────────────────────────────────────── */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        /* vertical variant: take remaining width */
        variant === 'vertical' ? 'flex-1' : 'mt-4',
        className,
      )}
      {...props}
    />
  );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
