import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Centred spinner with optional caption. */
export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground', className)}>
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Standardised error block with retry. */
export function ErrorState({ error, onRetry, className }) {
  const message = error?.message || 'Something went wrong.';
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 py-10 text-center', className)}>
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

/** Standardised empty state. */
export function EmptyState({ title = 'No data', description, icon: Icon = Inbox, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/**
 * One-stop wrapper: renders loading / error / empty / children based on state.
 *   <AsyncBoundary loading={loading} error={error} isEmpty={!data?.length} onRetry={refetch}>
 *     ...content...
 *   </AsyncBoundary>
 */
export function AsyncBoundary({ loading, error, isEmpty, onRetry, emptyProps, loadingLabel, children }) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState {...emptyProps} />;
  return children;
}
