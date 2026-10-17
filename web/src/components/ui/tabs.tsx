import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ─── List (tab bar) variants ────────────────────────────────── */
// "underline" is the default variant name kept for call-site compatibility,
// but its look now matches main's single tab style exactly: main has no
// underline/pill/vertical distinction — every TabsList on main is a muted
// rounded-md strip with filled-pill active triggers (src/components/ui/tabs.tsx).
const tabsListVariants = cva('inline-flex items-center justify-center', {
  variants: {
    variant: {
      underline: [
        'h-10 rounded-[var(--radius)] bg-[var(--color-muted)] p-1',
        'text-[var(--color-muted-foreground)]',
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
    'text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        underline: [
          'px-3 py-1.5 rounded-[var(--radius-sm)]',
          'text-[var(--color-muted-foreground)]',
          'data-[state=active]:bg-[var(--color-primary)]',
          'data-[state=active]:text-[var(--color-primary-foreground)]',
          'data-[state=active]:shadow-[var(--shadow-sm)]',
        ],
        pill: [
          'flex-1 px-3 py-1.5 rounded-[var(--radius-sm)]',
          'text-[var(--color-muted-foreground)]',
          'hover:text-[var(--color-foreground)]',
          'data-[state=active]:bg-[var(--color-surface)]',
          'data-[state=active]:text-[var(--color-foreground)]',
          // --shadow-sm per the design system's "Segmented active" shadow spec.
          'data-[state=active]:shadow-[var(--shadow-sm)]',
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
        'focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)]',
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
