/**
 * DataModal
 *
 * A Dialog that owns its own loading/error/empty state by driving
 * a TanStack Query query internally. Consumers pass a render prop
 * that only receives data in the success state — they never write
 * their own isLoading/isError branches.
 *
 * Usage:
 *
 *   <DataModal<Patient>
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Patient Details"
 *     queryKey={['patient', patientId]}
 *     queryFn={() => patientsApi.getById(patientId)}
 *     size="lg"
 *   >
 *     {(patient) => <PatientDetailCard patient={patient} />}
 *   </DataModal>
 */
import * as React from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  type DialogContentProps,
} from '@/components/ui/dialog';

/* ─── Types ──────────────────────────────────────────────────── */
export interface DataModalProps<TData> {
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal title shown in the header. */
  title: string;
  /** Optional subtitle/description shown below the title. */
  description?: string;
  /** TanStack Query key. The query is only executed when open=true. */
  queryKey: QueryKey;
  /** TanStack Query fetcher function. */
  queryFn: () => Promise<TData>;
  /** How long (ms) before stale refetch. Defaults to 5 min. */
  staleTime?: number;
  /** Render prop: receives the resolved data and returns content. */
  children: (data: TData) => React.ReactNode;
  /** Dialog size variant. */
  size?: DialogContentProps['size'];
  /** Optional footer content (passed as-is, rendered below the data area). */
  footer?: React.ReactNode;
  /** Message shown when data resolves to null/undefined. */
  emptyMessage?: string;
}

/* ─── Internal sub-components ───────────────────────────────── */
function SkeletonBlock() {
  return (
    <div className="space-y-3 p-1" aria-busy="true" aria-label="Loading content">
      <div className="h-4 w-3/4 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
      <div className="h-4 w-1/2 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
      <div className="h-4 w-5/6 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
      <div className="h-4 w-2/3 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
      <div className="h-20 mt-4 animate-pulse rounded-[var(--radius)] bg-[var(--color-muted)]" />
    </div>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry: () => void;
}

function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-8',
        'text-center text-[var(--color-muted-foreground)]',
      )}
      role="alert"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center",
          "h-12 w-12 rounded-[var(--radius-lg)]",
          "bg-[var(--color-error-soft)]"
        )}
      >
        <AlertCircle
          className="h-6 w-6 text-[var(--color-error-soft-foreground)]"
        />
      </span>
      <p className="text-[length:var(--text-body)]">{message}</p>
      <button
        onClick={onRetry}
        className={cn(
          'inline-flex items-center gap-1.5 text-[length:var(--text-body)] font-medium',
          'text-[var(--color-primary)] hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          'rounded-[var(--radius-xs)]',
        )}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-8',
        'text-center text-[var(--color-muted-foreground)]',
      )}
    >
      <p className="text-[length:var(--text-body)]">{message}</p>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
export function DataModal<TData>({
  open,
  onOpenChange,
  title,
  description,
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000,
  children,
  size = 'md',
  footer,
  emptyMessage = 'No data found.',
}: DataModalProps<TData>) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime,
    enabled: open, // only fetch when the modal is open
  });

  function renderBody() {
    if (isLoading) return <SkeletonBlock />;
    if (isError) {
      const msg =
        error instanceof Error ? error.message : 'Failed to load data.';
      return <ErrorBlock message={msg} onRetry={refetch} />;
    }
    if (data == null) return <EmptyBlock message={emptyMessage} />;
    return children(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-2">{renderBody()}</div>

        {footer && (
          <div className="mt-6 flex justify-end gap-3">{footer}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
