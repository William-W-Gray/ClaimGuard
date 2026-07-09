import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import {
  fetchInvestigation,
  updateInvestigation,
  addInvestigationComment,
  fetchUsers,
  type InvestigationUpdate,
} from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { PriorityBadge, StatusBadge } from '@/components/shared/Badges';
import {
  CaseStatusBadge,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_RESOLUTIONS,
  CASE_RESOLUTION_LABELS,
} from '@/components/shared/CaseBadges';
import { ErrorState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/SkeletonLoader';
import { formatCurrency, formatDate, formatDateTime, formatTimeAgo } from '@/lib/formatters';
import { ArrowLeft, MessageSquarePlus, Save, Loader2, ExternalLink } from 'lucide-react';

export function InvestigationDetailPage() {
  const { investigationId } = useParams({ from: '/investigations/$investigationId' });
  const queryClient = useQueryClient();

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['investigation', investigationId],
    queryFn: () => fetchInvestigation(investigationId),
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers() });

  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [comment, setComment] = useState('');

  // Sync form with loaded case.
  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setPriority(item.priority);
      setResolution(item.resolution ?? '');
      setNotes(item.resolutionNotes ?? '');
      setAssignedTo(item.assignedTo ?? '');
    }
  }, [item]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] });
    queryClient.invalidateQueries({ queryKey: ['investigations'] });
  };

  const saveMutation = useMutation({
    mutationFn: (changes: InvestigationUpdate) => updateInvestigation(investigationId, changes),
    onSuccess: invalidate,
  });
  const commentMutation = useMutation({
    mutationFn: (body: string) => addInvestigationComment(investigationId, body),
    onSuccess: () => {
      setComment('');
      invalidate();
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Investigation">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (isError || !item) {
    return (
      <AppShell title="Investigation Not Found">
        <ErrorState title="Investigation not found" onRetry={refetch} />
      </AppShell>
    );
  }

  function handleSave() {
    const changes: InvestigationUpdate = { status, priority, assignedTo };
    if (resolution) changes.resolution = resolution;
    if (notes) changes.resolutionNotes = notes;
    saveMutation.mutate(changes);
  }

  function handleComment(e: FormEvent) {
    e.preventDefault();
    const body = comment.trim();
    if (body) commentMutation.mutate(body);
  }

  return (
    <AppShell
      title={`Case · ${item.claimRef ?? item.id.slice(0, 8)}`}
      subtitle="Investigation workflow"
    >
      <div className="max-w-screen-xl mx-auto space-y-5">
        <Link
          to="/investigations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy transition-colors"
        >
          <ArrowLeft size={14} /> Back to Investigations
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left: case + claim */}
          <div className="xl:col-span-2 space-y-4">
            {/* Header */}
            <div className="page-card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xl font-bold text-gray-900">
                      {item.claimRef ?? 'Claim'}
                    </span>
                    <CaseStatusBadge status={item.status} />
                    <PriorityBadge priority={item.priority as any} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Opened {formatTimeAgo(item.createdAt)}
                    {item.resolvedAt && ` · Resolved ${formatDate(item.resolvedAt)}`}
                    {' · '}
                    {item.assignedToName ? (
                      <span className="text-gray-600 font-medium">Assigned to {item.assignedToName}</span>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </p>
                </div>
                {item.claimRef && (
                  <Link
                    to="/queue/$claimRef"
                    params={{ claimRef: item.claimRef }}
                    className="btn-secondary text-xs"
                  >
                    View claim <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-400">Member</p>
                  <p className="text-sm font-medium text-gray-800">{item.memberName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Provider</p>
                  <p className="text-sm font-medium text-gray-800">{item.providerName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Claim Amount</p>
                  <p className="text-sm font-bold text-gray-900">
                    {item.claimedAmount != null ? formatCurrency(item.claimedAmount) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Risk / Decision</p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold ${
                        (item.riskScore ?? 0) >= 80
                          ? 'text-red-600'
                          : (item.riskScore ?? 0) >= 50
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.riskScore ?? '—'}
                    </span>
                    {item.decision && <StatusBadge decision={item.decision as any} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="page-card p-5">
              <h3 className="mb-4">Case Notes &amp; Comments</h3>

              <form onSubmit={handleComment} className="mb-4">
                <textarea
                  className="form-input min-h-[72px] resize-y"
                  placeholder="Add a note or comment for the case file…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                    disabled={!comment.trim() || commentMutation.isPending}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <MessageSquarePlus size={13} />
                    )}
                    Add comment
                  </button>
                </div>
              </form>

              {item.comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {item.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(c.authorName ?? 'A').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-800">
                            {c.authorName ?? 'Agent'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: manage */}
          <div className="space-y-4">
            <div className="page-card p-5">
              <h3 className="mb-4">Manage Case</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {CASE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {CASE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Assigned to
                  </label>
                  <select
                    className="form-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                        {u.roles.length ? ` · ${u.roles[0]}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Resolution
                  </label>
                  <select
                    className="form-select"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option value="">— Not resolved —</option>
                    {CASE_RESOLUTIONS.map((r) => (
                      <option key={r} value={r}>
                        {CASE_RESOLUTION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Resolution notes
                  </label>
                  <textarea
                    className="form-input min-h-[80px] resize-y"
                    placeholder="Outcome, actions taken, recovery details…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  className="btn-primary w-full justify-center"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  Save changes
                </button>

                {saveMutation.isSuccess && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg p-2">
                    Case updated.
                  </p>
                )}
                {saveMutation.isError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                    Could not save changes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
