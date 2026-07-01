import { create } from 'zustand';
import {
  clearTokens,
  getRefreshToken,
  getToken,
  setTokens,
} from '@/lib/apiClient';
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  type AuthUser,
} from '@/lib/api';
import { ApiError } from '@/lib/apiClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  loggingIn: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

let listenerBound = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  error: null,
  loggingIn: false,

  bootstrap: async () => {
    // React to token-refresh failures raised deep in the API client.
    if (!listenerBound && typeof window !== 'undefined') {
      window.addEventListener('cg:logout', () => {
        clearTokens();
        set({ status: 'unauthenticated', user: null });
      });
      listenerBound = true;
    }

    if (!getToken()) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const user = await fetchMe();
      set({ status: 'authenticated', user });
    } catch {
      clearTokens();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (email, password) => {
    set({ loggingIn: true, error: null });
    try {
      const tokens = await loginRequest(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await fetchMe();
      set({ status: 'authenticated', user, loggingIn: false });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
      clearTokens();
      set({ status: 'unauthenticated', user: null, error: message, loggingIn: false });
      return false;
    }
  },

  logout: async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await logoutRequest(refresh);
      } catch {
        /* best effort — clear locally regardless */
      }
    }
    clearTokens();
    set({ status: 'unauthenticated', user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
