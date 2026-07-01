import { useQuery } from '@tanstack/react-query';
import { fetchQueue } from '@/lib/api';
import { Link } from '@tanstack/react-router';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { RiskScoreRing } from '@/components/shared/RiskScoreRing';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { ArrowRight, Clock } from 'lucide-react';

export function InvestigationSummary() {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => fetchQueue({ priority: 'ALL', status: 'ALL', search: '' }),
  });

  const top = claims
    .filter((c) => c.decision === 'PEND_INVESTIGATE' || c.decision === 'PEND_VERIFY' || c.decision === 'MEMBER_DISPUTED')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="page-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Investigation Queue — Top 5</h2>
        <Link to="/queue" className="text-xs text-brand-navy hover:underline font-medium flex items-center gap-1">
          Full queue <ArrowRight size={10} />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {top.map((claim) => (
          <Link
            key={claim.id}
            to="/queue/$claimRef"
            params={{ claimRef: claim.claimRef }}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <RiskScoreRing score={claim.riskScore} size={44} strokeWidth={5} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-brand-navy">{claim.claimRef}</span>
                <PriorityBadge priority={claim.priority} />
              </div>
              <p className="text-xs text-gray-600 truncate">{claim.member.name} · {claim.provider.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge decision={claim.decision} />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(claim.serviceDate)}
                </span>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(claim.claimedAmount)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
