import { useState, type FormEvent } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const DEMO_EMAIL = 'admin@claimguard.co.zw';
const DEMO_PASSWORD = 'ChangeMe!2026';

export function LoginPage() {
  const { login, loggingIn, error, clearError } = useAuthStore();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    await login(email.trim(), password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* Decorative brand panel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-navy/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-navy text-white mb-4 shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ClaimGuard 360°</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every claim verified. Every member protected.
          </p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="page-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sign in</h2>
            <p className="text-xs text-gray-500 mt-0.5">Access the fraud-prevention console</p>
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="form-input pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cimas.co.zw"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="form-input pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={loggingIn}
          >
            {loggingIn ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="text-center pt-1">
            <p className="text-[11px] text-gray-400">
              Demo credentials are pre-filled. Powered by ClaimGuard FraudShield.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
