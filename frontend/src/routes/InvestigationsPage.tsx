import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { fetchInvestigations } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { PriorityBadge } from '@/components/shared/Badges';
import { SkeletonTableBody } from '@/components/shared/SkeletonLoader';
import { EmptyState, ErrorState } from '@/components/shared/EmptyState';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { StatCard } from '@/components/shared/StatCard';
import { CaseStatusBadge, ResolutionBadge } from '@/components/shared/CaseBadges';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { FolderSearch, FolderOpen, CheckCircle2, AlertOctagon, Filter, UserCheck } from 'lucide-react';

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;
const STATUS_LABELS: Record<string, string> = {
  ALL: 'All',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function InvestigationsPage() {
  const [status, setStatus] = useState<string>('ALL');
  const [myCasesOnly, setMyCasesOnly] = useState(false);
  const user = useAuthStore((s) => s.user);

  const { data: allCases = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['investigations', status],
    queryFn: () => fetchInvestigations(status),
  });

  const cases =
    myCasesOnly && user ? allCases.filter((c) => c.assignedTo === user.id) : allCases;

  const {
    page,
    pageSize,
    pageItems,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(cases, 10);

  // Summary counts reflect the currently-visible set.
  const openCount = cases.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  const escalated = cases.filter((c) => c.status === 'ESCALATED').length;
  const resolved = cases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <AppShell title="Investigations" subtitle="Fraud case management — assign, track, resolve">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Cases" value={cases.length} icon={<FolderSearch size={20} />} accentColor="#1A4D8F" />
          <StatCard title="Open / Active" value={openCount} icon={<FolderOpen size={20} />} accentColor="#D97706" />
          <StatCard title="Escalated" value={escalated} icon={<AlertOctagon size={20} />} accentColor="#DC2626" />
          <StatCard title="Resolved" value={resolved} icon={<CheckCircle2 size={20} />} accentColor="#16A34A" />
        </div>

        {/* Filters */}
        <div className="page-card p-4 flex flex-wrap items-center gap-2">
          <Filter size={13} className="text-gray-400" aria-hidden="true" />
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                status === s ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-pressed={status === s}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}

          <button
            onClick={() => {
              setMyCasesOnly((v) => !v);
              setPage(1);
            }}
            className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              myCasesOnly
                ? 'bg-brand-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-pressed={myCasesOnly}
            title="Show only cases assigned to me"
          >
            <UserCheck size={12} />
            My cases
          </button>

          <span className="text-xs text-gray-400 ml-auto">
            {cases.length} case{cases.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="page-card overflow-hidden">
          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table" aria-label="Investigation cases">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Member</th>
                    <th>Provider</th>
                    <th>Risk</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Resolution</th>
                    <th>Opened</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTableBody rows={6} />
                ) : (
                  <tbody>
                    {cases.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-0">
                          <EmptyState
                            title={myCasesOnly ? 'No cases assigned to you' : 'No investigations'}
                            description={
                              myCasesOnly
                                ? 'Cases assigned to you will appear here.'
                                : 'Open a case from a flagged claim to start investigating.'
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((c) => (
                        <tr key={c.id} tabIndex={0}>
                          <td>
                            <Link
                              to="/investigations/$investigationId"
                              params={{ investigationId: c.id }}
                              className="text-brand-navy font-semibold hover:underline"
                            >
                              {c.claimRef ?? '—'}
                            </Link>
                          </td>
                          <td className="text-sm text-gray-700">{c.memberName ?? '—'}</td>
                          <td className="text-sm text-gray-600">{c.providerName ?? '—'}</td>
                          <td>
                            <span
                              className={`text-sm font-bold ${
                                (c.riskScore ?? 0) >= 80
                                  ? 'text-red-600'
                                  : (c.riskScore ?? 0) >= 50
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {c.riskScore ?? '—'}
                            </span>
                          </td>
                          <td><PriorityBadge priority={c.priority as any} /></td>
                          <td><CaseStatusBadge status={c.status} /></td>
                          <td className="text-sm text-gray-700">
                            {c.assignedToName ?? <span className="text-gray-300">Unassigned</span>}
                          </td>
                          <td>{c.resolution ? <ResolutionBadge resolution={c.resolution} /> : <span className="text-gray-300">—</span>}</td>
                          <td className="text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                          <td>
                            <Link
                              to="/investigations/$investigationId"
                              params={{ investigationId: c.id }}
                              className="text-xs text-brand-navy hover:underline font-medium"
                            >
                              Open case →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                )}
              </table>
            </div>
          )}
          {!isLoading && !isError && cases.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="case"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
