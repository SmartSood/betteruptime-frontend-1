import { cn } from '@/lib/utils';
import type { CheckStatus } from '@/lib/mock-data';

const statusConfig: Record<
  CheckStatus | 'UNKNOWN',
  { label: string; dot: string; badge: string }
> = {
  UP: {
    label: 'Up',
    dot: 'bg-success',
    badge: 'bg-success/10 text-success border-success/20',
  },
  DOWN: {
    label: 'Down',
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  DEGRADED: {
    label: 'Degraded',
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  UNKNOWN: {
    label: 'Unknown',
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CheckStatus | 'UNKNOWN';
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
