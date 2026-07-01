import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { fetchProviders } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { TrustBadgeChip } from '@/components/shared/Badges';
import { SkeletonTableBody } from '@/components/shared/SkeletonLoader';
import { EmptyState, ErrorState } from '@/components/shared/EmptyState';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { StatCard } from '@/components/shared/StatCard';
import { formatPercent, formatNumber } from '@/lib/formatters';
import { ShieldCheck, TrendingDown, AlertTriangle, Star } from 'lucide-react';
import type { Provider } from '@/types';

function TrustScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? '#16A34A' : score >= 70 ? '#1A4D8F' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`TrustScore: ${score}`}
        />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

export function TrustScorePage() {
  const { data: providers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  const verified = providers.filter((p) => p.badge === 'VERIFIED').length;
  const standard = providers.filter((p) => p.badge === 'STANDARD').length;
  const caution = providers.filter((p) => p.badge === 'CAUTION').length;
  const review = providers.filter((p) => p.badge === 'REVIEW').length;

  const sorted = [...providers].sort((a, b) => b.trustScore - a.trustScore);

  const {
    page,
    pageSize,
    pageItems: pagedProviders,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sorted, 10);

  return (
    <AppShell title="Provider TrustScore Dashboard" subtitle="Provider reputation intelligence · Powered by ClaimGuard">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Badge summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Verified" value={verified} subtitle="TrustScore 90–100" icon={<ShieldCheck size={20} />} accentColor="#16A34A" />
          <StatCard title="Standard" value={standard} subtitle="TrustScore 70–89" icon={<Star size={20} />} accentColor="#1A4D8F" />
          <StatCard title="Caution" value={caution} subtitle="TrustScore 50–69" icon={<AlertTriangle size={20} />} accentColor="#D97706" />
          <StatCard title="Under Review" value={review} subtitle="TrustScore below 50" icon={<TrendingDown size={20} />} accentColor="#DC2626" />
        </div>

        {/* Provider table */}
        <div className="page-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">All Registered Providers</h2>
            <span className="text-xs text-gray-400">{providers.length} providers</span>
          </div>

          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table" aria-label="Provider TrustScore table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Type</th>
                    <th>City</th>
                    <th>TrustScore</th>
                    <th>Badge</th>
                    <th>Flags (90d)</th>
                    <th>Dispute %</th>
                    <th>Shortfall Index</th>
                    <th>Total Claims</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTableBody rows={6} />
                ) : (
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr><td colSpan={10}><EmptyState title="No providers found" /></td></tr>
                    ) : pagedProviders.map((provider) => (
                      <ProviderRow key={provider.id} provider={provider} />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          )}
          {!isLoading && !isError && sorted.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="provider"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProviderRow({ provider }: { provider: Provider }) {
  return (
    <tr>
      <td>
        <div>
          <p className="font-medium text-gray-800 text-sm">{provider.name}</p>
          <p className="text-[10px] text-gray-400 font-mono">{provider.code}</p>
        </div>
      </td>
      <td>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{provider.type}</span>
      </td>
      <td className="text-sm text-gray-600">{provider.city}</td>
      <td className="w-36"><TrustScoreBar score={provider.trustScore} /></td>
      <td><TrustBadgeChip badge={provider.badge} /></td>
      <td>
        <span className={`text-sm font-semibold ${provider.flags90d > 10 ? 'text-red-600' : provider.flags90d > 3 ? 'text-amber-600' : 'text-green-600'}`}>
          {provider.flags90d}
        </span>
      </td>
      <td>
        <span className={`text-sm font-semibold ${provider.disputeRate > 5 ? 'text-red-600' : provider.disputeRate > 2 ? 'text-amber-600' : 'text-green-600'}`}>
          {formatPercent(provider.disputeRate)}
        </span>
      </td>
      <td>
        <span className={`text-sm font-semibold ${provider.shortfallIndex > 1.5 ? 'text-red-600' : provider.shortfallIndex > 1.1 ? 'text-amber-600' : 'text-green-600'}`}>
          {provider.shortfallIndex.toFixed(2)}×
        </span>
      </td>
      <td className="text-sm text-gray-600">{formatNumber(provider.totalClaims)}</td>
      <td>
        <Link
          to="/trustscore/$providerCode"
          params={{ providerCode: provider.code }}
          className="text-xs text-brand-navy hover:underline font-medium"
        >
          View profile →
        </Link>
      </td>
    </tr>
  );
}
