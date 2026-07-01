import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, accentColor = '#1A4D8F', className }: StatCardProps) {
  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-1.5', trend.positive ? 'text-green-600' : 'text-red-600')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        )}
      </div>
      {/* Accent bar */}
      <div className="mt-4 h-0.5 rounded-full" style={{ backgroundColor: `${accentColor}30` }}>
        <div className="h-full rounded-full w-3/4 transition-all" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
