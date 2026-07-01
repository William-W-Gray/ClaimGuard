import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ESCALATED: 'bg-red-50 text-red-700 border-red-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function CaseStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('badge', STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200', className)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const RESOLUTION_STYLES: Record<string, string> = {
  CONFIRMED_FRAUD: 'bg-red-50 text-red-700 border-red-200',
  FALSE_POSITIVE: 'bg-green-50 text-green-700 border-green-200',
  DATA_ERROR: 'bg-amber-50 text-amber-700 border-amber-200',
  RECOVERED: 'bg-teal-50 text-teal-700 border-teal-200',
  NO_ACTION: 'bg-gray-100 text-gray-600 border-gray-200',
};

const RESOLUTION_LABELS: Record<string, string> = {
  CONFIRMED_FRAUD: 'Confirmed Fraud',
  FALSE_POSITIVE: 'False Positive',
  DATA_ERROR: 'Data Error',
  RECOVERED: 'Funds Recovered',
  NO_ACTION: 'No Action',
};

export function ResolutionBadge({
  resolution,
  className,
}: {
  resolution: string;
  className?: string;
}) {
  return (
    <span className={cn('badge', RESOLUTION_STYLES[resolution] ?? 'bg-gray-100 text-gray-600 border-gray-200', className)}>
      {RESOLUTION_LABELS[resolution] ?? resolution}
    </span>
  );
}

export const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];
export const CASE_RESOLUTIONS = [
  'CONFIRMED_FRAUD',
  'FALSE_POSITIVE',
  'DATA_ERROR',
  'RECOVERED',
  'NO_ACTION',
];
export { STATUS_LABELS as CASE_STATUS_LABELS, RESOLUTION_LABELS as CASE_RESOLUTION_LABELS };
