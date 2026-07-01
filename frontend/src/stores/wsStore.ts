import { create } from 'zustand';
import type { WSEvent } from '@/types';
import { realtimeClient } from '@/lib/realtime';

interface WSState {
  connected: boolean;
  recentEvents: WSEvent[];
  lastEvent: WSEvent | null;
  pendingQueueCount: number;
  initialized: boolean;
  connect: () => void;
  disconnect: () => void;
  addEvent: (event: WSEvent) => void;
}

export const useWSStore = create<WSState>((set, get) => ({
  connected: false,
  recentEvents: [],
  lastEvent: null,
  pendingQueueCount: 12,
  initialized: false,

  connect: () => {
    // Guard against double-registration (React strict-mode / re-mounts).
    if (!get().initialized) {
      realtimeClient.onStatus((connected) => set({ connected }));

      realtimeClient.on('*', (event) => {
        set((state) => ({
          recentEvents: [event, ...state.recentEvents].slice(0, 50),
          lastEvent: event,
          pendingQueueCount:
            event.type === 'queue_updated'
              ? (event.payload.pending as number) ?? state.pendingQueueCount
              : state.pendingQueueCount,
        }));
      });

      set({ initialized: true });
    }

    realtimeClient.connect();
  },

  disconnect: () => {
    realtimeClient.disconnect();
    set({ connected: false });
  },

  addEvent: (event) => {
    set((state) => ({
      recentEvents: [event, ...state.recentEvents].slice(0, 50),
      lastEvent: event,
    }));
  },
}));
