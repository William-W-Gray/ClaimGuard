import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { DashboardPage } from '@/routes/DashboardPage';
import { QueuePage } from '@/routes/QueuePage';
import { ClaimDetailPage } from '@/routes/ClaimDetailPage';
import { InvestigationsPage } from '@/routes/InvestigationsPage';
import { InvestigationDetailPage } from '@/routes/InvestigationDetailPage';
import { TrustScorePage } from '@/routes/TrustScorePage';
import { ProviderDetailPage } from '@/routes/ProviderDetailPage';
import { MemberPortalPage } from '@/routes/MemberPortalPage';
import { DemoControlPage } from '@/routes/DemoControlPage';
import { ROICalculatorPage } from '@/routes/ROICalculatorPage';
import { USSDSimulatorPage } from '@/routes/USSDSimulatorPage';
import { UserManagementPage } from '@/routes/UserManagementPage';

// ─── Root Route ───────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// ─── Index redirect ───────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/dashboard' }); },
  component: () => null,
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
});

// ─── Queue ────────────────────────────────────────────────────────────────────

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/queue',
  component: QueuePage,
});

const claimDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/queue/$claimRef',
  component: ClaimDetailPage,
});

// ─── Investigations ─────────────────────────────────────────────────────────────

const investigationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/investigations',
  component: InvestigationsPage,
});

const investigationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/investigations/$investigationId',
  component: InvestigationDetailPage,
});

// ─── TrustScore ───────────────────────────────────────────────────────────────

const trustScoreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trustscore',
  component: TrustScorePage,
});

const providerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trustscore/$providerCode',
  component: ProviderDetailPage,
});

// ─── Members ──────────────────────────────────────────────────────────────────

const membersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members',
  component: MemberPortalPage,
});

// ─── Demo ─────────────────────────────────────────────────────────────────────

const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/demo',
  component: DemoControlPage,
});

// ─── ROI ──────────────────────────────────────────────────────────────────────

const roiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roi',
  component: ROICalculatorPage,
});

// ─── USSD ─────────────────────────────────────────────────────────────────────

const ussdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ussd',
  component: USSDSimulatorPage,
});

// ─── User management (admin) ────────────────────────────────────────────────────

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team',
  component: UserManagementPage,
});

// ─── Router ───────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  queueRoute,
  claimDetailRoute,
  investigationsRoute,
  investigationDetailRoute,
  trustScoreRoute,
  providerDetailRoute,
  membersRoute,
  demoRoute,
  roiRoute,
  ussdRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });

// Type-safe router declaration
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
