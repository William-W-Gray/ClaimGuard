// Real ClaimGuard API — backed by the FastAPI service.
// Function signatures mirror the former mock layer so pages consume it unchanged.
import { api } from './apiClient';
import type {
  Claim,
  Provider,
  Member,
  QueueFilters,
  DashboardMetrics,
  SavingsDataPoint,
  USSDStats,
} from '@/types';

// ─── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperuser: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export async function loginRequest(email: string, password: string): Promise<TokenPair> {
  return api.post<TokenPair>('/auth/login', { email, password });
}

export async function fetchMe(): Promise<AuthUser> {
  return api.get<AuthUser>('/auth/me');
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

export async function fetchUsers(): Promise<UserSummary[]> {
  return api.get<UserSummary[]>('/users');
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  channel: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResult {
  items: NotificationItem[];
  unread: number;
}

export async function fetchNotifications(): Promise<NotificationsResult> {
  const env = await api.getEnvelope<NotificationItem[]>('/notifications', {
    params: { page: 1, page_size: 50 },
  });
  const meta = env.metadata as { unread?: number };
  return { items: env.data ?? [], unread: meta?.unread ?? 0 };
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function clearNotifications(): Promise<void> {
  await api.del('/notifications');
}

// ─── Investigations ───────────────────────────────────────────────────────────

export interface InvestigationComment {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface Investigation {
  id: string;
  claimId: string;
  claimRef: string | null;
  decision: string | null;
  riskScore: number | null;
  memberName: string | null;
  providerName: string | null;
  claimedAmount: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  status: string;
  priority: string;
  resolution: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  comments: InvestigationComment[];
}

export interface InvestigationUpdate {
  status?: string;
  priority?: string;
  resolution?: string;
  resolutionNotes?: string;
  assignedTo?: string;
}

export async function fetchInvestigations(status?: string): Promise<Investigation[]> {
  return api.get<Investigation[]>('/investigations', {
    params: {
      page: 1,
      page_size: 200,
      status: status && status !== 'ALL' ? status : undefined,
    },
  });
}

export async function fetchInvestigation(id: string): Promise<Investigation | null> {
  return api.get<Investigation | null>(`/investigations/${encodeURIComponent(id)}`, {
    nullOn404: true,
  });
}

export async function openInvestigation(
  claimRef: string,
  priority?: string,
): Promise<Investigation> {
  return api.post<Investigation>('/investigations', { claimId: claimRef, priority });
}

export async function updateInvestigation(
  id: string,
  changes: InvestigationUpdate,
): Promise<Investigation> {
  return api.patch<Investigation>(`/investigations/${encodeURIComponent(id)}`, changes);
}

export async function addInvestigationComment(
  id: string,
  body: string,
): Promise<Investigation> {
  return api.post<Investigation>(
    `/investigations/${encodeURIComponent(id)}/comments`,
    { body },
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return api.get<DashboardMetrics>('/dashboard/metrics');
}

export async function fetchSavingsData(): Promise<SavingsDataPoint[]> {
  return api.get<SavingsDataPoint[]>('/dashboard/savings');
}

export async function fetchUSSDStats(): Promise<USSDStats> {
  return api.get<USSDStats>('/dashboard/ussd');
}

// ─── Claims ─────────────────────────────────────────────────────────────────────

export async function fetchLiveFeed(): Promise<Claim[]> {
  return api.get<Claim[]>('/claims/live-feed', { params: { limit: 8 } });
}

export async function fetchQueue(filters?: Partial<QueueFilters>): Promise<Claim[]> {
  // Server-side filtering; a generous page size lets the client paginate the result set.
  return api.get<Claim[]>('/claims', {
    params: {
      page: 1,
      page_size: 200,
      search: filters?.search || undefined,
      priority: filters?.priority && filters.priority !== 'ALL' ? filters.priority : undefined,
      status: filters?.status && filters.status !== 'ALL' ? filters.status : undefined,
    },
  });
}

export async function fetchClaimByRef(claimRef: string): Promise<Claim | null> {
  return api.get<Claim | null>(`/claims/${encodeURIComponent(claimRef)}`, { nullOn404: true });
}

export async function approveClaim(claimRef: string): Promise<Claim> {
  return api.post<Claim>(`/claims/${encodeURIComponent(claimRef)}/approve`);
}

export async function rejectClaim(
  claimRef: string,
  reason: 'REJECT_FRAUD' | 'REJECT_ERROR',
): Promise<Claim> {
  return api.post<Claim>(`/claims/${encodeURIComponent(claimRef)}/reject`, { reason });
}

// ─── Providers / TrustScore ─────────────────────────────────────────────────────

export async function fetchProviders(): Promise<Provider[]> {
  return api.get<Provider[]>('/providers', { params: { page: 1, page_size: 200 } });
}

export async function fetchProviderByCode(code: string): Promise<Provider | null> {
  return api.get<Provider | null>(`/providers/${encodeURIComponent(code)}`, { nullOn404: true });
}

export async function fetchProviderClaims(providerCode: string): Promise<Claim[]> {
  return api.get<Claim[]>(`/providers/${encodeURIComponent(providerCode)}/claims`);
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function fetchMembers(): Promise<Member[]> {
  return api.get<Member[]>('/members', { params: { page: 1, page_size: 200 } });
}

export async function fetchMemberById(id: string): Promise<Member | null> {
  return api.get<Member | null>(`/members/${encodeURIComponent(id)}`, { nullOn404: true });
}

export async function fetchMemberClaims(memberId: string): Promise<Claim[]> {
  return api.get<Claim[]>(`/members/${encodeURIComponent(memberId)}/claims`);
}

// ─── Demo ───────────────────────────────────────────────────────────────────────

export async function runDemoScenario(scenarioId: string): Promise<void> {
  await api.post(`/demo/scenarios/${encodeURIComponent(scenarioId)}/run`);
}
