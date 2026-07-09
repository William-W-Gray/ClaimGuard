import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, type NewUserInput } from '@/lib/api';
import { ApiError } from '@/lib/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState, ErrorState } from '@/components/shared/EmptyState';
import { SkeletonTableBody } from '@/components/shared/SkeletonLoader';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Users, UserPlus, ShieldCheck, ShieldAlert, Eye, EyeOff, RefreshCw, Check, X,
} from 'lucide-react';

interface RoleMeta {
  value: string;
  label: string;
  description: string;
  className: string;
}

const ROLES: RoleMeta[] = [
  { value: 'agent', label: 'Agent', description: 'Handles the investigation queue',
    className: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'analyst', label: 'Analyst', description: 'Fraud analytics & TrustScore management',
    className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'auditor', label: 'Auditor', description: 'Read-only audit & compliance access',
    className: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'admin', label: 'Admin', description: 'Full platform administration',
    className: 'bg-red-50 text-red-700 border-red-200' },
];

function RoleBadge({ role }: { role: string }) {
  const meta = ROLES.find((r) => r.value === role);
  return (
    <span className={cn('badge', meta?.className ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
      {meta?.label ?? role}
    </span>
  );
}

function randomPassword(): string {
  const sets = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const arr = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(arr, (n) => sets[n % sets.length]).join('');
}

const EMPTY: NewUserInput = { fullName: '', email: '', password: '', roles: ['agent'] };

export function UserManagementPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = !!currentUser && (currentUser.roles.includes('admin') || currentUser.isSuperuser);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserInput>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: NewUserInput) => createUser(input),
    onSuccess: (_res, input) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setBanner(`${input.fullName} can now sign in with ${input.email} and the password you set.`);
      setForm(EMPTY);
      setShowPassword(false);
      setShowForm(false);
    },
  });

  const errorMessage =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error
        ? 'Could not create the user. Please try again.'
        : null;

  const passwordTooShort = form.password.length > 0 && form.password.length < 8;
  const canSubmit =
    form.fullName.trim() && form.email.trim() && form.password.length >= 8 && form.roles.length > 0;

  if (!isAdmin) {
    return (
      <AppShell title="User Management" subtitle="Team & access administration">
        <div className="max-w-screen-md mx-auto">
          <EmptyState
            icon={<ShieldAlert size={40} />}
            title="Admin access required"
            description="Only administrators can manage user accounts. Contact an admin if you need access."
          />
        </div>
      </AppShell>
    );
  }

  const roleCount = (role: string) => users.filter((u) => u.roles.includes(role)).length;

  return (
    <AppShell title="User Management" subtitle="Create and manage accounts that access ClaimGuard">
      <div className="max-w-screen-xl mx-auto space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={users.length} icon={<Users size={20} />} accentColor="#1A4D8F" />
          <StatCard title="Admins" value={roleCount('admin')} icon={<ShieldCheck size={20} />} accentColor="#DC2626" />
          <StatCard title="Analysts" value={roleCount('analyst')} icon={<ShieldCheck size={20} />} accentColor="#1A4D8F" />
          <StatCard title="Agents" value={roleCount('agent')} icon={<Users size={20} />} accentColor="#16A34A" />
        </div>

        {banner && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
            <Check size={16} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{banner}</span>
            <button onClick={() => setBanner(null)} aria-label="Dismiss" className="text-green-600 hover:text-green-800">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Create form */}
        <div className="page-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3>{showForm ? 'New User Account' : 'Team Members'}</h3>
            <button
              className={showForm ? 'btn-secondary' : 'btn-primary'}
              onClick={() => { setShowForm((v) => !v); createMutation.reset(); }}
            >
              {showForm ? <><X size={16} /> Cancel</> : <><UserPlus size={16} /> New User</>}
            </button>
          </div>

          {showForm && (
            <form
              className="p-5 space-y-4"
              onSubmit={(e) => { e.preventDefault(); if (canSubmit) createMutation.mutate(form); }}
            >
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    id="fullName" className="form-input" placeholder="Rudo Chidziva"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    id="email" type="email" className="form-input" placeholder="rudo@claimguard.co.zw"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">
                  Temporary password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="password" type={showPassword ? 'text' : 'password'}
                      className="form-input pr-10" placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button" className="btn-secondary"
                    onClick={() => { setForm({ ...form, password: randomPassword() }); setShowPassword(true); }}
                  >
                    <RefreshCw size={14} /> Generate
                  </button>
                </div>
                {passwordTooShort && (
                  <p className="text-xs text-red-600 mt-1">Password must be at least 8 characters.</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Share this with the user; they sign in with it.</p>
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1.5">Role</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const selected = form.roles[0] === r.value;
                    return (
                      <button
                        type="button" key={r.value}
                        onClick={() => setForm({ ...form, roles: [r.value] })}
                        className={cn(
                          'flex items-start gap-2 text-left rounded-lg border px-3 py-2.5 transition-colors',
                          selected ? 'border-brand-navy bg-brand-navy/5' : 'border-gray-200 hover:border-gray-300'
                        )}
                        aria-pressed={selected}
                      >
                        <span className={cn(
                          'mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                          selected ? 'border-brand-navy bg-brand-navy' : 'border-gray-300'
                        )}>
                          {selected && <Check size={11} className="text-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <RoleBadge role={r.value} />
                          </span>
                          <span className="block text-xs text-gray-500 mt-1">{r.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" className="btn-primary" disabled={!canSubmit || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : <><UserPlus size={16} /> Create account</>}
                </button>
                <button
                  type="button" className="btn-secondary"
                  onClick={() => { setForm(EMPTY); createMutation.reset(); setShowForm(false); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Users table */}
          {!showForm && (
            <div className="overflow-x-auto">
              <table className="data-table" aria-label="User accounts">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTableBody rows={4} />
                ) : (
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="!cursor-default">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {u.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </span>
                            <span className="font-medium text-gray-800">
                              {u.fullName}
                              {u.id === currentUser?.id && (
                                <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase">You</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="text-gray-600">{u.email}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length ? u.roles.map((r) => <RoleBadge key={r} role={r} />)
                              : <span className="text-xs text-gray-400">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
              {!isLoading && users.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No users yet" description="Create the first account to get started." />
                </div>
              )}
            </div>
          )}
        </div>

        {isError && (
          <ErrorState onRetry={() => refetch()} />
        )}
      </div>
    </AppShell>
  );
}
