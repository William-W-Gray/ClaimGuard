import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { fetchProviderByCode, fetchProviderClaims } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { TrustBadgeChip } from '@/components/shared/Badges';
import { FlagBadgeList } from '@/components/shared/FlagBadge';
import { StatusBadge } from '@/components/shared/Badges';
import { ErrorState, EmptyState } from '@/components/shared/EmptyState';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { Skeleton } from '@/components/shared/SkeletonLoader';
import { formatCurrency, formatPercent, formatDate, formatNumber } from '@/lib/formatters';

import { ArrowLeft, MapPin, Phone, Calendar, ShieldCheck } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export function ProviderDetailPage() {
  const { providerCode } = useParams({ from: '/trustscore/$providerCode' });

  const { data: provider, isLoading: providerLoading, isError } = useQuery({
    queryKey: ['provider', providerCode],
    queryFn: () => fetchProviderByCode(providerCode),
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['provider-claims', providerCode],
    queryFn: () => fetchProviderClaims(providerCode),
    enabled: !!providerCode,
  });

  const {
    page,
    pageSize,
    pageItems: pagedClaims,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(claims, 10);

  const radarData = provider ? [
    { metric: 'Claim Accuracy', value: Math.max(0, 100 - provider.shortfallIndex * 20) },
    { metric: 'Member Trust', value: Math.max(0, 100 - provider.disputeRate * 5) },
    { metric: 'Flag Rate', value: Math.max(0, 100 - provider.flags90d * 2) },
    { metric: 'Volume Score', value: Math.min(100, provider.totalClaims / 50) },
    { metric: 'TrustScore', value: provider.trustScore },
  ] : [];

  if (providerLoading) {
    return (
      <AppShell title="Provider Detail">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (isError || !provider) {
    return (
      <AppShell title="Provider Not Found">
        <ErrorState title="Provider not found" description={`No provider with code ${providerCode}`} />
      </AppShell>
    );
  }

  const scoreColor = provider.trustScore >= 90 ? '#16A34A' : provider.trustScore >= 70 ? '#1A4D8F' : provider.trustScore >= 50 ? '#D97706' : '#DC2626';

  return (
    <AppShell title={provider.name} subtitle={`${provider.code} · ${provider.type} · ${provider.city}`}>
      <div className="max-w-screen-xl mx-auto space-y-5">
        <Link to="/trustscore" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy transition-colors">
          <ArrowLeft size={14} /> Back to Providers
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left - Profile */}
          <div className="space-y-4">
            {/* Score card */}
            <div className="page-card p-6 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${scoreColor}15` }}>
                <ShieldCheck size={32} style={{ color: scoreColor }} />
              </div>
              <div className="text-5xl font-bold mb-1" style={{ color: scoreColor }}>{provider.trustScore}</div>
              <p className="text-sm text-gray-500 mb-3">TrustScore</p>
              <TrustBadgeChip badge={provider.badge} />
              <p className="text-xs text-gray-400 mt-2">Member-facing: badge only (score hidden)</p>
            </div>

            {/* Details */}
            <div className="page-card p-5">
              <h3 className="mb-3">Provider Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Address</p>
                    <p className="font-medium text-gray-800">{provider.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="font-medium text-gray-800">{provider.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Registered</p>
                    <p className="font-medium text-gray-800">{formatDate(provider.registrationDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Last Audit</p>
                    <p className="font-medium text-gray-800">{formatDate(provider.lastAuditDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="page-card p-5">
              <h3 className="mb-4">Key Metrics (90d)</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Claims', value: formatNumber(provider.totalClaims), color: '#1A4D8F' },
                  { label: 'Avg Claim Value', value: formatCurrency(provider.averageClaimValue), color: '#1A4D8F' },
                  { label: 'Dispute Rate', value: formatPercent(provider.disputeRate), color: provider.disputeRate > 5 ? '#DC2626' : '#16A34A' },
                  { label: 'Shortfall Index', value: `${provider.shortfallIndex.toFixed(2)}×`, color: provider.shortfallIndex > 1.5 ? '#DC2626' : '#16A34A' },
                  { label: 'Flags (90d)', value: String(provider.flags90d), color: provider.flags90d > 10 ? '#DC2626' : '#16A34A' },
                ].map((m) => (
                  <div key={m.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{m.label}</span>
                    <span className="text-sm font-bold" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Charts + Claims */}
          <div className="xl:col-span-2 space-y-4">
            {/* Radar chart */}
            <div className="page-card p-5">
              <h3 className="mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#F1F5F9" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Radar name="Provider" dataKey="value" stroke={scoreColor} fill={scoreColor} fillOpacity={0.15} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}`, 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Claims */}
            <div className="page-card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3>Recent Claims from this Provider</h3>
              </div>
              {claims.length === 0 ? (
                <EmptyState title="No claims found" description="No claim history available for this provider." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table" aria-label="Provider claims">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Decision</th>
                        <th>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedClaims.map((claim) => (
                        <tr key={claim.id}>
                          <td>
                            <Link
                              to="/queue/$claimRef"
                              params={{ claimRef: claim.claimRef }}
                              className="text-brand-navy font-semibold hover:underline"
                            >
                              {claim.claimRef}
                            </Link>
                          </td>
                          <td className="text-sm text-gray-700">{claim.member.name}</td>
                          <td className="font-semibold">{formatCurrency(claim.claimedAmount)}</td>
                          <td className="text-xs text-gray-500">{formatDate(claim.serviceDate)}</td>
                          <td><StatusBadge decision={claim.decision} /></td>
                          <td><FlagBadgeList flags={claim.flags} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="claim"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
