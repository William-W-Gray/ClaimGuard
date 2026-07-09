import { useQuery } from '@tanstack/react-query';
import { fetchMembers, fetchMemberClaims } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, ChannelBadge } from '@/components/shared/Badges';
import { FlagBadgeList } from '@/components/shared/FlagBadge';
import { ErrorState } from '@/components/shared/EmptyState';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';
import { Link } from '@tanstack/react-router';
import { Phone, MapPin, Calendar, MessageCircle, CheckCircle, XCircle, Shield } from 'lucide-react';

export function MemberPortalPage() {
  // Demo portal: show the first member returned by the API.
  const { data: members = [], isLoading: mLoading, isError } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });
  // Prefer the demo protagonist (matches the WhatsApp panel); fall back to first.
  const member = members.find((m) => m.name === 'Tendai Moyo') ?? members[0];

  const { data: claims = [], isLoading: cLoading } = useQuery({
    queryKey: ['member-claims', member?.id],
    queryFn: () => fetchMemberClaims(member!.id),
    enabled: !!member,
  });

  const isLoading = mLoading || cLoading;

  const {
    page,
    pageSize,
    pageItems: pagedClaims,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(claims, 5);

  if (isError || (!isLoading && !member)) {
    return <AppShell title="Member Portal"><ErrorState /></AppShell>;
  }

  const benefitPct = member ? (member.benefitUsed / member.annualBenefit) * 100 : 0;
  const remaining = member ? member.annualBenefit - member.benefitUsed : 0;

  return (
    <AppShell title="Member Portal" subtitle="MemberGuard · Benefit transparency for Cimas members">
      <div className="max-w-screen-xl mx-auto space-y-5">

        {/* Header banner */}
        <div className="rounded-2xl gradient-teal text-white p-6 flex items-center gap-5 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_70%)]" />
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {member?.name?.split(' ').map(n => n[0]).join('') ?? 'TM'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{isLoading ? '—' : member?.name}</h1>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{member?.plan}</span>
            </div>
            <p className="text-teal-100 text-sm">{isLoading ? '—' : member?.memberNumber}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-teal-100 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={12} />{member?.city}</span>
              <span className="flex items-center gap-1"><Phone size={12} />{member?.phone}</span>
              {member?.conditions.length ? (
                <span className="flex items-center gap-1"><Shield size={12} />Conditions: {member.conditions.join(', ')}</span>
              ) : (
                <span className="flex items-center gap-1 text-green-200"><Shield size={12} />No registered conditions</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-teal-100 text-xs mb-1">Annual Benefit</p>
            <p className="text-2xl font-bold">{formatCurrency(member?.annualBenefit ?? 0)}</p>
            <p className="text-teal-200 text-xs mt-1">{formatCurrency(remaining)} remaining</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left col */}
          <div className="space-y-4">
            {/* Benefit balance */}
            <div className="page-card p-5">
              <h3 className="mb-4">Benefit Usage</h3>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Used</span>
                  <span className="font-semibold">{formatCurrency(member?.benefitUsed ?? 0)} / {formatCurrency(member?.annualBenefit ?? 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${benefitPct}%`,
                      background: benefitPct > 80 ? '#DC2626' : benefitPct > 60 ? '#D97706' : '#16A34A',
                    }}
                    role="progressbar"
                    aria-valuenow={Math.round(benefitPct)}
                    aria-valuemax={100}
                    aria-label={`${Math.round(benefitPct)}% of annual benefit used`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{formatPercent(benefitPct, 0)} used this year</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(member?.benefitUsed ?? 0)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Used</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{formatCurrency(remaining)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
                </div>
              </div>
            </div>

            {/* WhatsApp mock */}
            <div className="page-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={16} className="text-green-600" />
                <h3>WhatsApp Conversation</h3>
              </div>
              <div className="bg-[#ECE5DD] rounded-xl p-3 space-y-2 text-sm max-h-80 overflow-y-auto">
                {/* Cimas message */}
                <div className="flex">
                  <div className="bg-white rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                    <p className="text-[10px] font-bold text-green-700 mb-1">Cimas ClaimGuard</p>
                    <p className="text-gray-800 leading-relaxed text-xs">
                      Hi <strong>Tendai</strong>! City Pharmacy Bulawayo submitted a claim for 4 medications today (<strong>$88.00</strong>).
                      <br /><br />
                      Your shortfall was <strong>$22</strong> — slightly above the usual $12–$18 for this visit type.
                      <br /><br />
                      Did you visit today?<br />
                      Reply <strong>1</strong> to confirm ✓<br />
                      Reply <strong>2</strong> if something is wrong ✗<br />
                      Reply <strong>HELP</strong> for Cimas support.
                      <br /><br />
                      <span className="text-gray-400 text-[9px]">Cimas is protecting your benefits. Ref: CG-00291.</span>
                    </p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">18:42 ✓✓</p>
                  </div>
                </div>
                {/* Member reply */}
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none p-3 max-w-[50%] shadow-sm">
                    <p className="text-gray-800 font-medium text-xs">2</p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">18:43 ✓✓</p>
                  </div>
                </div>
                {/* Confirmation message */}
                <div className="flex">
                  <div className="bg-white rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                    <p className="text-[10px] font-bold text-green-700 mb-1">Cimas ClaimGuard</p>
                    <p className="text-gray-800 leading-relaxed text-xs">
                      Thank you, Tendai. We have flagged this claim for investigation. A Cimas agent will review this within 24 hours.
                      <br /><br />
                      Your benefits are safe. Ref: CG-00291.
                    </p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">18:43 ✓✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="xl:col-span-2 space-y-4">
            {/* Claims history */}
            <div className="page-card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3>Claims History</h3>
              </div>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading claims…</div>
              ) : claims.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No claims found for this member</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pagedClaims.map((claim) => (
                    <div key={claim.id} className="px-5 py-4 flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        claim.decision === 'APPROVE' ? 'bg-green-50' :
                        claim.decision === 'PEND_INVESTIGATE' ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        {claim.decision === 'APPROVE' ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : claim.decision === 'PEND_INVESTIGATE' ? (
                          <XCircle size={18} className="text-red-500" />
                        ) : (
                          <Calendar size={18} className="text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-800">{claim.provider.name}</span>
                          <StatusBadge decision={claim.decision} />
                          {claim.memberNotificationSent && claim.memberNotificationChannel && (
                            <ChannelBadge channel={claim.memberNotificationChannel} />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {claim.items.map(i => i.description).join(', ')}
                        </p>
                        <FlagBadgeList flags={claim.flags} />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(claim.claimedAmount)}</p>
                        <p className="text-xs text-gray-400">{formatDate(claim.serviceDate)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Shortfall: {formatCurrency(claim.memberShortfall)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {claims.length > 0 && (
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

            {/* Shortfall comparison */}
            <div className="page-card p-5">
              <h3 className="mb-4">Shortfall Comparison — Recent Claims</h3>
              <div className="space-y-3">
                {claims.map((claim) => {
                  const expectedMid = (claim.expectedShortfall[0] + claim.expectedShortfall[1]) / 2;
                  const deviation = ((claim.memberShortfall - expectedMid) / expectedMid * 100);
                  return (
                    <div key={claim.id} className="flex items-center gap-3">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs text-gray-600 truncate">{claim.claimRef}</p>
                        <p className="text-[10px] text-gray-400 truncate">{claim.provider.name}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full relative">
                            {/* Expected range */}
                            <div
                              className="absolute h-full bg-green-200 rounded-full"
                              style={{
                                left: `${(claim.expectedShortfall[0] / 50) * 100}%`,
                                width: `${((claim.expectedShortfall[1] - claim.expectedShortfall[0]) / 50) * 100}%`,
                              }}
                            />
                            {/* Actual shortfall */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                              style={{
                                left: `${Math.min(95, (claim.memberShortfall / 50) * 100)}%`,
                                backgroundColor: deviation > 30 ? '#DC2626' : deviation > 10 ? '#D97706' : '#16A34A',
                              }}
                              aria-label={`Actual shortfall: $${claim.memberShortfall}`}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Expected: {formatCurrency(claim.expectedShortfall[0])}–{formatCurrency(claim.expectedShortfall[1])}</span>
                          <span className={deviation > 30 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                            Actual: {formatCurrency(claim.memberShortfall)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
