import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard, ListFilter, ShieldCheck, Users, Hash,
  PlayCircle, Calculator, ChevronLeft, ChevronRight, Activity, FolderSearch,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useWSStore } from '@/stores/wsStore';
import { LiveDot } from '@/components/shared/LiveDot';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
}

// The demo scenario runner only exists on the backend when DEMO_MODE is on, so
// only surface its page in demo builds (VITE_DEMO_MODE=true).
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Command Centre', icon: LayoutDashboard },
  { to: '/queue', label: 'Investigation Queue', icon: ListFilter },
  { to: '/investigations', label: 'Investigations', icon: FolderSearch },
  { to: '/trustscore', label: 'Provider TrustScore', icon: ShieldCheck },
  { to: '/members', label: 'Member Portal', icon: Users },
  { to: '/ussd', label: 'USSD Service', icon: Hash },
  { to: '/roi', label: 'ROI Calculator', icon: Calculator },
  ...(IS_DEMO
    ? [{ to: '/demo', label: 'Demo Control Panel', icon: PlayCircle, highlight: true }]
    : []),
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { connected } = useWSStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'sidebar fixed top-0 left-0 h-screen z-30 flex flex-col transition-all duration-300',
        'bg-sidebar-bg shadow-sidebar',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center flex-shrink-0">
            <Activity size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">ClaimGuard</p>
              <p className="text-slate-400 text-[10px] leading-tight">360° Platform</p>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1 text-slate-500 hover:text-white transition-colors rounded"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Collapsed toggle */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="mx-auto mt-3 p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-sidebar-hover"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden space-y-0.5">
        {sidebarOpen && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-3 mb-2">Platform</p>
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon, highlight }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'nav-item',
                isActive && 'active',
                highlight && !isActive && 'text-amber-400 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen && (
                <>
                  <span className="truncate">{label}</span>
                  {highlight && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white px-1.5 py-0.5 rounded">
                      DEMO
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border flex-shrink-0">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <LiveDot size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">
                {connected ? 'Live connection active' : 'Connecting…'}
              </p>
              <p className="text-[9px] text-slate-600">NH263 Bridge · Demo Mode</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <LiveDot size="sm" />
          </div>
        )}
      </div>
    </aside>
  );
}
