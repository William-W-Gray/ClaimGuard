import { create } from 'zustand';
import {
  clearTokens,
  refreshAccessToken,
  setToken,
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

    // No access token survives a reload (memory-only). Ask the backend to mint
    // a fresh one from the httpOnly refresh cookie; if that fails there is no
    // valid session.
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
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
      // Access token → memory; refresh token is set by the backend as an
      // httpOnly cookie and never touched by JS.
      setToken(tokens.accessToken);
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
    // Server revokes the refresh token and clears the cookie (identified via the
    // httpOnly cookie itself — no token needs to be sent from JS).
    try {
      await logoutRequest();
    } catch {
      /* best effort — clear locally regardless */
    }
    clearTokens();
    set({ status: 'unauthenticated', user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
