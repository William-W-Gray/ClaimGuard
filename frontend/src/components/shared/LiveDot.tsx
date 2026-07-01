import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface LiveDotProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function LiveDot({ className, size = 'md' }: LiveDotProps) {
  return (
    <span
      className={cn('relative inline-flex', className)}
      aria-label="Live — real-time connection active"
    >
      <span
        className={cn(
          'absolute inline-flex rounded-full bg-green-400 opacity-75 animate-ping',
          size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full bg-green-500',
          size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
        )}
      />
    </span>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  );
}
