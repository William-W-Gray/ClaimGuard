import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { fetchQueue } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { RiskScoreRing } from '@/components/shared/RiskScoreRing';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { FlagBadgeList } from '@/components/shared/FlagBadge';
import { LatencyBadge } from '@/components/shared/LatencyBadge';
import { SkeletonTableBody } from '@/components/shared/SkeletonLoader';
import { EmptyState, ErrorState } from '@/components/shared/EmptyState';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { PageHeader } from '@/components/shared/LiveDot';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Search, RefreshCcw, Filter } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { Priority, ClaimDecision } from '@/types';

const PRIORITIES: Array<{ label: string; value: Priority | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const STATUSES: Array<{ label: string; value: ClaimDecision | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Investigating', value: 'PEND_INVESTIGATE' },
  { label: 'Pending Verify', value: 'PEND_VERIFY' },
  { label: 'Disputed', value: 'MEMBER_DISPUTED' },
  { label: 'Approved', value: 'APPROVE' },
];

export function QueuePage() {
  const { queueFilters, setQueueFilters } = useUIStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: claims = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['queue', queueFilters, refreshKey],
    queryFn: () => fetchQueue(queueFilters),
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

  return (
    <AppShell title="Investigation Queue" subtitle="Active claims under review — FraudShield">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        <PageHeader
          title=""
          actions={
            <button
              onClick={() => { setRefreshKey((k) => k + 1); refetch(); }}
              className="btn-secondary text-xs"
              aria-label="Refresh queue"
            >
              <RefreshCcw size={13} />
              Refresh
            </button>
          }
        />

        {/* Filters */}
        <div className="page-card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              className="form-input pl-8"
              placeholder="Search by ref, member, provider…"
              value={queueFilters.search}
              onChange={(e) => setQueueFilters({ search: e.target.value })}
              aria-label="Search queue"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-400" aria-hidden="true" />
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setQueueFilters({ priority: p.value })}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  queueFilters.priority === p.value
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={queueFilters.priority === p.value}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setQueueFilters({ status: s.value })}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  queueFilters.status === s.value
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={queueFilters.status === s.value}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 ml-auto">{claims.length} result{claims.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="page-card overflow-hidden">
          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table" aria-label="Investigation queue">
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Ref / NH263</th>
                    <th>Member</th>
                    <th>Provider</th>
                    <th>Amount</th>
                    <th>Priority</th>
                    <th>Decision</th>
                    <th>Date</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTableBody rows={6} />
                ) : (
                  <tbody>
                    {claims.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-0">
                          <EmptyState
                            title="No claims match your filters"
                            description="Try adjusting the search or filter criteria."
                          />
                        </td>
                      </tr>
                    ) : (
                      pagedClaims.map((claim) => (
                        <tr key={claim.id} tabIndex={0}>
                          <td>
                            <Link to="/queue/$claimRef" params={{ claimRef: claim.claimRef }}>
                              <RiskScoreRing score={claim.riskScore} size={48} strokeWidth={6} />
                            </Link>
                          </td>
                          <td>
                            <Link
                              to="/queue/$claimRef"
                              params={{ claimRef: claim.claimRef }}
                              className="text-brand-navy font-semibold hover:underline"
                            >
                              {claim.claimRef}
                            </Link>
                            <p className="text-[10px] text-gray-400 mt-0.5">{claim.nh263Ref}</p>
                            <LatencyBadge ms={claim.latencyMs} className="mt-1" />
                          </td>
                          <td>
                            <p className="font-medium text-gray-800 text-sm">{claim.member.name}</p>
                            <p className="text-[10px] text-gray-400">{claim.member.memberNumber} · {claim.member.plan}</p>
                          </td>
                          <td>
                            <p className="text-sm text-gray-700">{claim.provider.name}</p>
                            <p className="text-[10px] text-gray-400">{claim.provider.city}</p>
                          </td>
                          <td className="font-bold text-gray-900">{formatCurrency(claim.claimedAmount)}</td>
                          <td><PriorityBadge priority={claim.priority} /></td>
                          <td><StatusBadge decision={claim.decision} /></td>
                          <td className="text-xs text-gray-500">{formatDate(claim.serviceDate)}</td>
                          <td><FlagBadgeList flags={claim.flags} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                )}
              </table>
            </div>
          )}
          {!isLoading && !isError && claims.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="claim"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
