import { cn } from '@/lib/utils';
import type { ClaimDecision, TrustBadge, Priority, Channel, MemberResponseStatus } from '@/types';
import { DECISION_COLOR, DECISION_LABEL, TRUST_BADGE_COLOR, PRIORITY_COLOR, CHANNEL_COLOR } from '@/lib/constants';

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  decision: ClaimDecision;
  className?: string;
}

export function StatusBadge({ decision, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', DECISION_COLOR[decision], className)}>
      {DECISION_LABEL[decision]}
    </span>
  );
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────

interface TrustBadgeProps {
  badge: TrustBadge;
  className?: string;
}

export function TrustBadgeChip({ badge, className }: TrustBadgeProps) {
  return (
    <span className={cn('badge', TRUST_BADGE_COLOR[badge], className)}>
      {badge === 'VERIFIED' && '✓ '}
      {badge}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('badge border-0', PRIORITY_COLOR[priority], className)}>
      {priority}
    </span>
  );
}

// ─── Channel Badge ────────────────────────────────────────────────────────────

interface ChannelBadgeProps {
  channel: Channel;
  className?: string;
}

const CHANNEL_ICONS: Record<Channel, string> = {
  WHATSAPP: '💬',
  APP_FEED: '📱',
  USSD: '*#',
  SMS: '✉️',
};

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  return (
    <span className={cn('badge border-0', CHANNEL_COLOR[channel], className)}>
      <span aria-hidden="true">{CHANNEL_ICONS[channel]}</span>
      {channel === 'APP_FEED' ? 'App' : channel === 'WHATSAPP' ? 'WhatsApp' : channel}
    </span>
  );
}

// ─── Member Response Badge ────────────────────────────────────────────────────

interface MemberResponseBadgeProps {
  status: MemberResponseStatus;
  className?: string;
}

const RESPONSE_STYLES: Record<MemberResponseStatus, string> = {
  PENDING: 'bg-gray-50 text-gray-600 border-gray-200',
  CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
  DISPUTED: 'bg-red-50 text-red-700 border-red-200',
  NO_RESPONSE: 'bg-gray-100 text-gray-500 border-gray-200',
};

const RESPONSE_LABELS: Record<MemberResponseStatus, string> = {
  PENDING: 'Awaiting response',
  CONFIRMED: '✓ Confirmed by member',
  DISPUTED: '✗ Disputed by member',
  NO_RESPONSE: 'No response',
};

export function MemberResponseBadge({ status, className }: MemberResponseBadgeProps) {
  return (
    <span className={cn('badge', RESPONSE_STYLES[status], className)}>
      {RESPONSE_LABELS[status]}
    </span>
  );
}
