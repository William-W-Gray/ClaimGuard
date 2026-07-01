import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Menu, Wifi, WifiOff, X, Trash2, CheckSquare, LogOut } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useWSStore } from '@/stores/wsStore';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { formatTimeAgo } from '@/lib/formatters';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggleSidebar, sidebarOpen } = useUIStore();
  const { connected } = useWSStore();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });
  const notifications = data?.items ?? [];
  const unreadCount = data?.unread ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markAsRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
  const clearAll = useMutation({ mutationFn: clearNotifications, onSuccess: invalidate });

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        'header fixed top-0 right-0 h-16 z-20 flex items-center justify-between px-6',
        'bg-white border-b border-gray-100 shadow-sm transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
      aria-label="Page header"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
          connected
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        )}>
          {connected ? (
            <Wifi size={12} aria-hidden="true" />
          ) : (
            <WifiOff size={12} aria-hidden="true" />
          )}
          {connected ? 'Live' : 'Connecting'}
        </div>

        {/* Demo mode badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          Demo Mode
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              dropdownOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            )}
            aria-label={`View notifications (${unreadCount} unread)`}
            aria-expanded={dropdownOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-[480px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="p-1 text-gray-400 hover:text-brand-navy rounded hover:bg-gray-200 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckSquare size={14} />
                  </button>
                  <button
                    onClick={() => clearAll.mutate()}
                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="overflow-y-auto divide-y divide-gray-50 flex-1 min-h-0">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => {
                    const iconColor =
                      n.type === 'alert'
                        ? 'bg-red-500'
                        : n.type === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-blue-500';

                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'p-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors relative cursor-pointer',
                          !n.read && 'bg-blue-50/40 font-medium'
                        )}
                        onClick={() => {
                          if (!n.read) markAsRead.mutate(n.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {/* Type indicator dot */}
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', iconColor)} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {n.link ? (
                            <Link to={n.link as any} className="block group">
                              <p className="text-xs font-bold text-gray-800 group-hover:text-brand-navy transition-colors truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                            </Link>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-gray-800 truncate">{n.title}</p>
                              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>

                        {/* Unread blue beacon */}
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute right-3 top-4" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2"
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
          >
            {user ? initials(user.fullName) : 'U'}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 truncate">{user?.fullName ?? 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {user?.roles?.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut size={15} className="text-gray-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

