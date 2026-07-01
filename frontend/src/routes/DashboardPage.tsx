import { AppShell } from '@/components/layout/AppShell';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { LiveClaimFeed } from '@/components/dashboard/LiveClaimFeed';
import { SavingsChart } from '@/components/dashboard/SavingsChart';
import { InvestigationSummary } from '@/components/dashboard/InvestigationSummary';
import { USSDActivityStrip } from '@/components/dashboard/USSDActivityStrip';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export function DashboardPage() {
  return (
    <AppShell
      title="Loss-Control Command Centre"
      subtitle="ClaimGuard 360° · FraudShield AI · Real-time fraud intelligence"
    >
      <div className="space-y-5 max-w-screen-2xl mx-auto">
        {/* USSD Strip */}
        <ErrorBoundary>
          <USSDActivityStrip />
        </ErrorBoundary>

        {/* Metric Cards */}
        <ErrorBoundary>
          <MetricCards />
        </ErrorBoundary>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <ErrorBoundary>
              <SavingsChart />
            </ErrorBoundary>
          </div>
          <div>
            <ErrorBoundary>
              <InvestigationSummary />
            </ErrorBoundary>
          </div>
        </div>

        {/* Live Feed */}
        <ErrorBoundary>
          <LiveClaimFeed />
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}
