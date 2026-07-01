import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCcw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        {icon ?? <Inbox className="text-gray-400" size={24} />}
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1 normal-case tracking-normal">{title}</h3>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-secondary mt-4 text-xs">
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="text-red-500" size={24} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1 normal-case tracking-normal">{title}</h3>
      <p className="text-xs text-gray-400 max-w-xs mb-4">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs">
          <RefreshCcw size={12} />
          Try again
        </button>
      )}
    </div>
  );
}
