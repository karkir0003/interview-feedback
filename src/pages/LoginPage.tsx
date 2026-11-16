import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { DevQuickLogin } from '../components/auth/DevQuickLogin';
import { Mail, Sparkles, AlertTriangle, AlertCircle, ArrowRight, Loader2, Award } from 'lucide-react';

function formatAuthError(code: string, rawMessage: string): { title: string; message: string } {
  const desc = decodeURIComponent(rawMessage.replace(/\+/g, ' ')).toLowerCase();
  const c = code.toLowerCase();

  if (c === 'otp_expired' || desc.includes('expired') || desc.includes('invalid or has expired')) {
    return {
      title: 'Sign-in Link Expired',
      message: 'This magic link has expired or has already been used. Please enter your email below to receive a fresh sign-in link.',
    };
  }

  if (
    c === 'over_email_send_rate_limit' ||
    c === 'over_request_rate_limit' ||
    desc.includes('rate limit') ||
    desc.includes('rate_limit') ||
    desc.includes('rate limit exceeded')
  ) {
    return {
      title: 'Too Many Requests',
      message: 'Too many sign-in emails were requested in a short window. Please wait a moment before trying again.',
    };
  }

  if (c === 'access_denied') {
    return {
      title: 'Access Denied',
      message: 'Sign-in was canceled or denied. Please try again.',
    };
  }

  return {
    title: 'Authentication Error',
    message: rawMessage || 'Unable to authenticate with this link. Please request a new sign-in link.',
  };
}

export function LoginPage() {
  const { user, role, isLoading, signInWithMagicLink, signInWithGoogle, signInWithPassword, isConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (user && !isLoading) {
      const redirect = new URLSearchParams(location.search).get('redirect');
      const destination = redirect || (role === 'candidate' ? '/history' : '/admin');
      navigate(destination, { replace: true });
    }
  }, [user, role, isLoading, location.search, navigate]);

  useEffect(() => {
    document.title = 'Sign In — MockSignal';

    // Parse both query parameters and URL hash fragments for Supabase errors
    const searchParams = new URLSearchParams(location.search);
    const rawHash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
    const hashParams = new URLSearchParams(rawHash);

    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    const error = hashParams.get('error') || searchParams.get('error');

    if (errorCode || errorDescription || error) {
      const friendly = formatAuthError(errorCode || error || '', errorDescription || '');
      setAuthError(friendly);
      showError(friendly.title, friendly.message);

      // Clean up URL hash and search params without triggering a page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, showError]);

  // Cooldown countdown timer for resending magic links
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleDevLogin = async (targetEmail: string) => {
    setIsSubmitting(true);
    const { error } = await signInWithPassword(targetEmail, 'password123');
    setIsSubmitting(false);

    if (error) {
      const friendly = formatAuthError(error.name || '', error.message || '');
      showError('Dev login failed', friendly.message);
    } else {
      success('Signed in', `Authenticated as ${targetEmail}`);
      const redirect = new URLSearchParams(location.search).get('redirect');
      navigate(redirect || (targetEmail.includes('candidate') ? '/history' : '/admin'));
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showError('Invalid email', 'Please enter a valid email address');
      return;
    }

    if (cooldownSeconds > 0) {
      showError('Please wait', `You can request another link in ${cooldownSeconds}s.`);
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    const redirectParam = new URLSearchParams(location.search).get('redirect');
    const targetRedirect = redirectParam
      ? `${window.location.origin}/login?redirect=${encodeURIComponent(redirectParam)}`
      : `${window.location.origin}/login`;

    const { error } = await signInWithMagicLink(email, targetRedirect);
    setIsSubmitting(false);

    if (error) {
      const friendly = formatAuthError(error.name || '', error.message || '');
      setAuthError(friendly);
      showError(friendly.title, friendly.message);
    } else {
      setIsMagicLinkSent(true);
      setCooldownSeconds(60);
      success('Magic link dispatched!', `Check ${email} for your secure sign-in link.`);
    }
  };

  const handleResendMagicLink = async () => {
    if (cooldownSeconds > 0 || isSubmitting || !email) return;
    setIsSubmitting(true);
    setAuthError(null);

    const redirectParam = new URLSearchParams(location.search).get('redirect');
    const targetRedirect = redirectParam
      ? `${window.location.origin}/login?redirect=${encodeURIComponent(redirectParam)}`
      : `${window.location.origin}/login`;

    const { error } = await signInWithMagicLink(email, targetRedirect);
    setIsSubmitting(false);

    if (error) {
      const friendly = formatAuthError(error.name || '', error.message || '');
      setAuthError(friendly);
      showError(friendly.title, friendly.message);
    } else {
      setCooldownSeconds(60);
      success('Link Resent!', `A fresh sign-in link has been sent to ${email}.`);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSubmitting(false);
      if (
        error.message?.toLowerCase().includes('provider is not enabled') ||
        error.message?.toLowerCase().includes('validation_failed')
      ) {
        showError(
          'Google Provider Not Configured',
          'Google OAuth is not enabled in your Supabase project yet. Use the Magic Link email input below or enable Google in Supabase > Authentication > Providers.'
        );
      } else {
        showError('OAuth failed', error.message);
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-md shadow-blue-500/20 mb-4">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome to MockSignal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your interview evaluations and performance history.
          </p>
        </div>

        {/* Configuration notice if placeholder keys */}
        {!isConfigured && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Supabase Setup Required</p>
              <p className="mt-0.5 text-amber-800">
                To enable live authentication and database operations, add your project credentials to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code>:
              </p>
              <pre className="mt-1.5 p-2 bg-amber-100/70 rounded font-mono text-[10px] overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </div>
          </div>
        )}

        {/* Local Development Quick Logins */}
        <DevQuickLogin onLogin={handleDevLogin} isSubmitting={isSubmitting} />

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          {/* Friendly Auth Error Alert Banner */}
          {authError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">{authError.title}</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">{authError.message}</p>
              </div>
            </div>
          )}

          {isMagicLinkSent ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-600 mt-2">
                We sent a secure magic link to <strong className="text-slate-800">{email}</strong>.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Click the link in the email to automatically sign in.
              </p>
              <div className="mt-6 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResendMagicLink}
                  disabled={cooldownSeconds > 0 || isSubmitting}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                >
                  {cooldownSeconds > 0
                    ? `Resend link in ${cooldownSeconds}s`
                    : "Didn't receive the email? Resend link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMagicLinkSent(false);
                    setAuthError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || !isConfigured}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium relative">
                  or with magic link
                </span>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      disabled={isSubmitting || !isConfigured}
                      className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured || cooldownSeconds > 0}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Resend Link ({cooldownSeconds}s)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Send Magic Link</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          First time? Logging in with your email unlocks your full interview timeline and calibrated rubrics automatically.
        </p>
      </div>
    </div>
  );
}
