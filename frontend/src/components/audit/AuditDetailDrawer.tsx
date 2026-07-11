import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { fetchAuditEntry, type AuditEntry } from '@/lib/api';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  X, ArrowUpRight, User, Clock, Globe, Fingerprint, FileText, History, ShieldAlert,
} from 'lucide-react';

// Mirror the list's action colour-coding so the drawer feels continuous.
export function actionTone(action: string): string {
  if (action.includes('approve') || action.includes('login')) return 'bg-green-50 text-green-700 border-green-200';
  if (action.includes('reject') || action.includes('delete') || action.includes('dispute')) return 'bg-red-50 text-red-700 border-red-200';
  if (action.includes('create') || action.includes('ingest')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (action.includes('view')) return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm text-gray-800 mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

// Deep-link an entity back to its record where a route exists (claims today).
function EntityRecordLink({ type, id }: { type: string; id: string }) {
  if (type === 'claim') {
    return (
      <Link
        to="/queue/$claimRef" params={{ claimRef: id }}
        className="inline-flex items-center gap-1 text-brand-navy text-sm font-medium hover:underline"
      >
        View claim record <ArrowUpRight size={13} />
      </Link>
    );
  }
  return null;
}

function RelatedRow({ entry, onSelect }: { entry: AuditEntry; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(entry.id)}
      className="w-full flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <span className={cn('badge flex-shrink-0', actionTone(entry.action))}>{entry.action}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
        {entry.actorName ?? entry.actorEmail ?? 'System'}
      </span>
      <span className="flex-shrink-0 text-[11px] text-gray-400">{formatDateTime(entry.createdAt)}</span>
    </button>
  );
}

export function AuditDetailDrawer({
  id, onClose, onSelect,
}: {
  id: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit', 'detail', id],
    queryFn: () => fetchAuditEntry(id),
  });

  const entry = data?.entry;
  const related = data?.related ?? [];
  const changeKeys = Object.keys(entry?.changes ?? {});

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      role="dialog" aria-modal="true" aria-label="Audit entry detail"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h3 className="mb-1">Audit event</h3>
            {entry && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('badge', actionTone(entry.action))}>{entry.action}</span>
                <span className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</span>
              </div>
            )}
          </div>
          <button className="icon-btn hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {isLoading && <div className="p-6 text-sm text-gray-400">Loading event…</div>}
        {isError && (
          <div className="p-6 flex items-center gap-2 text-sm text-red-600">
            <ShieldAlert size={16} /> Could not load this event.
          </div>
        )}

        {entry && (
          <div className="px-5 py-3 flex-1">
            <div className="divide-y divide-gray-50">
              <Field icon={<User size={15} />} label="Performed by">
                <p className="font-medium">{entry.actorName ?? entry.actorEmail ?? 'System'}</p>
                {entry.actorEmail && entry.actorName && (
                  <p className="text-xs text-gray-500">{entry.actorEmail}</p>
                )}
                {entry.actorRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.actorRoles.map((r) => (
                      <span key={r} className="badge bg-gray-100 text-gray-600 border-gray-200 capitalize">{r}</span>
                    ))}
                  </div>
                )}
                {entry.actorId && (
                  <p className="text-[11px] text-gray-400 font-mono mt-1 break-all">{entry.actorId}</p>
                )}
              </Field>

              <Field icon={<FileText size={15} />} label="Target record">
                <p>
                  <span className="capitalize">{entry.entityType}</span>
                  {entry.entityId && <span className="text-gray-400 font-mono"> · {entry.entityId}</span>}
                </p>
                {entry.entityId && (
                  <div className="mt-1"><EntityRecordLink type={entry.entityType} id={entry.entityId} /></div>
                )}
              </Field>

              <Field icon={<Globe size={15} />} label="Origin IP">
                <span className="font-mono text-xs">{entry.ipAddress ?? '—'}</span>
              </Field>

              <Field icon={<Fingerprint size={15} />} label="Request / event id">
                <p className="font-mono text-[11px] break-all text-gray-500">
                  {entry.requestId ?? 'request id not recorded'}
                </p>
                <p className="font-mono text-[11px] break-all text-gray-400">{entry.id}</p>
              </Field>

              <Field icon={<Clock size={15} />} label="Timestamp">
                {formatDateTime(entry.createdAt)}
              </Field>

              <Field icon={<FileText size={15} />} label="Changes">
                {changeKeys.length ? (
                  <pre className="mt-1 rounded-lg bg-gray-900 text-gray-100 text-[11px] leading-relaxed p-3 overflow-x-auto">
                    {JSON.stringify(entry.changes, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-400">No field changes recorded (read / lifecycle event).</span>
                )}
              </Field>
            </div>

            {/* Record history */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                <History size={13} /> Record history ({related.length})
              </p>
              {related.length ? (
                <div className="space-y-1.5">
                  {related.map((r) => <RelatedRow key={r.id} entry={r} onSelect={onSelect} />)}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No other recorded activity on this record.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
