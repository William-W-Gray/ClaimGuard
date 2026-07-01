import { create } from 'zustand';
import type { QueueFilters } from '@/types';

interface UIState {
  sidebarOpen: boolean;
  queueFilters: QueueFilters;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setQueueFilters: (filters: Partial<QueueFilters>) => void;
  resetQueueFilters: () => void;
}

const DEFAULT_FILTERS: QueueFilters = {
  search: '',
  priority: 'ALL',
  status: 'ALL',
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  queueFilters: DEFAULT_FILTERS,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setQueueFilters: (filters) =>
    set((state) => ({ queueFilters: { ...state.queueFilters, ...filters } })),

  resetQueueFilters: () => set({ queueFilters: DEFAULT_FILTERS }),
}));
