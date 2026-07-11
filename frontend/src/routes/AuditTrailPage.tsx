import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAuditLog, fetchAuditFilters, type AuditEntry } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState, ErrorState } from '@/components/shared/EmptyState';
import { SkeletonTableBody } from '@/components/shared/SkeletonLoader';
import { Pagination } from '@/components/shared/Pagination';
import { AuditDetailDrawer } from '@/components/audit/AuditDetailDrawer';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Search, X, ShieldAlert, RotateCcw } from 'lucide-react';

const PAGE_SIZE = 25;

// Colour-code the verb in an action so scanning the log is fast.
function actionTone(action: string): string {
  if (action.includes('approve') || action.includes('login')) return 'bg-green-50 text-green-700 border-green-200';
  if (action.includes('reject') || action.includes('delete') || action.includes('dispute')) return 'bg-red-50 text-red-700 border-red-200';
  if (action.includes('create') || action.includes('ingest')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (action.includes('view')) return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
}

function ActorCell({ entry }: { entry: AuditEntry }) {
  const name = entry.actorName ?? entry.actorEmail ?? 'System';
  const sub = entry.actorName ? entry.actorEmail : null;
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
        entry.actorName ? 'bg-brand-navy/10 text-brand-navy' : 'bg-gray-100 text-gray-400'
      )}>
        {entry.actorName ? initials(entry.actorName) : '—'}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{name}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function changeSummary(changes: Record<string, unknown>): string | null {
  const keys = Object.keys(changes ?? {});
  if (!keys.length) return null;
  return keys.map((k) => `${k}: ${JSON.stringify(changes[k])}`).join(', ');
}

export function AuditTrailPage() {
  const user = useAuthStore((s) => s.user);
  const canView = !!user && (user.isSuperuser || user.roles.some((r) => r === 'admin' || r === 'auditor'));

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: filters } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: fetchAuditFilters,
    enabled: canView,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit', { search, action, entityType, page }],
    queryFn: () => fetchAuditLog({ search, action, entityType, page, pageSize: PAGE_SIZE }),
    enabled: canView,
    placeholderData: keepPreviousData,
  });

  if (!canView) {
    return (
      <AppShell title="Audit Trail" subtitle="Who did what, and when">
        <div className="max-w-screen-md mx-auto">
          <EmptyState
            icon={<ShieldAlert size={40} />}
            title="Restricted"
            description="Only administrators and auditors can view the audit trail."
          />
        </div>
      </AppShell>
    );
  }

  const rows = data?.items ?? [];
  const pagination = data?.pagination;

  const applySearch = () => { setSearch(searchInput.trim()); setPage(1); };
  const resetAll = () => {
    setSearchInput(''); setSearch(''); setAction(''); setEntityType(''); setPage(1);
  };
  const hasActiveFilter = !!(search || action || entityType);

  return (
    <AppShell title="Audit Trail" subtitle="Immutable record of who did what, and when">
      <div className="max-w-screen-xl mx-auto space-y-4">
        {/* Filter bar */}
        <div className="page-card p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <label htmlFor="audit-search" className="block text-xs font-medium text-gray-600 mb-1">
                Search by person
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="audit-search"
                    className="form-input pl-9"
                    placeholder="Name or email…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
                  />
                  {searchInput && (
                    <button
                      onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button className="btn-primary" onClick={applySearch}>Search</button>
              </div>
            </div>

            <div>
              <label htmlFor="audit-action" className="block text-xs font-medium text-gray-600 mb-1">Action</label>
              <select
                id="audit-action" className="form-select min-w-[9rem]"
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
              >
                <option value="">All actions</option>
                {filters?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="audit-entity" className="block text-xs font-medium text-gray-600 mb-1">Entity</label>
              <select
                id="audit-entity" className="form-select min-w-[8rem]"
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              >
                <option value="">All types</option>
                {filters?.entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {hasActiveFilter && (
              <button className="btn-secondary" onClick={resetAll} title="Clear all filters">
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Log table */}
        <div className="page-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table" aria-label="Audit trail">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>IP</th>
                  <th>When</th>
                </tr>
              </thead>
              {isLoading ? (
                <SkeletonTableBody rows={8} />
              ) : (
                <tbody className={cn(isFetching && 'opacity-60 transition-opacity')}>
                  {rows.map((e) => {
                    const summary = changeSummary(e.changes);
                    return (
                      <tr
                        key={e.id}
                        className="align-top cursor-pointer"
                        onClick={() => setSelectedId(e.id)}
                        title="View full detail"
                      >
                        <td><ActorCell entry={e} /></td>
                        <td><span className={cn('badge', actionTone(e.action))}>{e.action}</span></td>
                        <td className="text-gray-600">
                          <span className="capitalize">{e.entityType}</span>
                          {e.entityId && <span className="text-gray-400"> · {e.entityId}</span>}
                        </td>
                        <td className="text-gray-500 max-w-xs">
                          {summary ? <span className="text-xs break-words">{summary}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-gray-400 text-xs font-mono">{e.ipAddress ?? '—'}</td>
                        <td className="text-gray-600 whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {!isLoading && rows.length === 0 && (
            <div className="p-8">
              <EmptyState
                title={hasActiveFilter ? 'No matching activity' : 'No activity yet'}
                description={hasActiveFilter ? 'Try a different name, action, or entity type.' : 'Actions will appear here as users work.'}
              />
            </div>
          )}

          {!isLoading && !isError && pagination && pagination.totalItems > 0 && (
            <div className="px-4 pb-4">
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={() => { /* fixed page size for the trail */ }}
                pageSizeOptions={[PAGE_SIZE]}
                itemLabel="event"
              />
            </div>
          )}
        </div>

        {isError && <ErrorState onRetry={() => refetch()} />}
      </div>

      {selectedId && (
        <AuditDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
        />
      )}
    </AppShell>
  );
}
