import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-page-bg overflow-hidden">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-16')}>
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto pt-16">
          <div className="p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
