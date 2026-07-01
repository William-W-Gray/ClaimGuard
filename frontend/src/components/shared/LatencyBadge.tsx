import { cn } from '@/lib/utils';
import { getLatencyColor, formatLatency } from '@/lib/formatters';
import { Zap } from 'lucide-react';

interface LatencyBadgeProps {
  ms: number;
  className?: string;
}

export function LatencyBadge({ ms, className }: LatencyBadgeProps) {
  const colorClass = getLatencyColor(ms);
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', colorClass, className)}
      aria-label={`AI scoring latency: ${formatLatency(ms)}`}
    >
      <Zap size={10} aria-hidden="true" />
      {formatLatency(ms)}
    </span>
  );
}
