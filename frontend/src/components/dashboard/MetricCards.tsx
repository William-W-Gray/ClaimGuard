import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '@/lib/api';
import { StatCard } from '@/components/shared/StatCard';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { ErrorState } from '@/components/shared/EmptyState';
import { FileText, AlertTriangle, DollarSign, MessageCircleWarning } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

export function MetricCards() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} />;
  }

  const cards = [
    {
      title: 'Claims Today',
      value: formatNumber(data.claimsToday),
      subtitle: `${formatNumber(data.autoApprovedToday)} auto-approved`,
      icon: <FileText size={20} />,
      accentColor: '#1A4D8F',
      trend: { value: '+12% vs yesterday', positive: true },
    },
    {
      title: 'Flagged',
      value: formatNumber(data.flaggedToday),
      subtitle: `${data.pendingInvestigation} under investigation`,
      icon: <AlertTriangle size={20} />,
      accentColor: '#DC2626',
      trend: { value: `${((data.flaggedToday / data.claimsToday) * 100).toFixed(1)}% flag rate`, positive: false },
    },
    {
      title: 'Estimated Saved',
      value: formatCurrency(data.estimatedSaved),
      subtitle: 'Q3 running total: $215,900',
      icon: <DollarSign size={20} />,
      accentColor: '#16A34A',
      trend: { value: '↑ On track for Q3 target', positive: true },
    },
    {
      title: 'Member Alerts',
      value: String(data.memberAlerts),
      subtitle: `${data.memberAlerts} disputed this week`,
      icon: <MessageCircleWarning size={20} />,
      accentColor: '#7B2D8B',
      trend: { value: 'WhatsApp · USSD · App', positive: true },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
}
