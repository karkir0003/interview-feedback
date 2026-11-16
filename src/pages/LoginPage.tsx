import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { DevQuickLogin } from '../components/auth/DevQuickLogin';
import { AuthErrorBanner } from '../components/auth/AuthErrorBanner';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { MagicLinkForm } from '../components/auth/MagicLinkForm';
import { MagicLinkSentView } from '../components/auth/MagicLinkSentView';
import { formatAuthError, FormattedAuthError } from '../lib/auth-errors';
import { AlertTriangle, Award } from 'lucide-react';

export function LoginPage() {
  const { user, role, isLoading, signInWithMagicLink, signInWithGoogle, signInWithPassword, isConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState<FormattedAuthError | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (user && !isLoading) {
      const redirect = new URLSearchParams(location.search).get('redirect');
      const destination = redirect || (role === 'candidate' ? '/history' : '/admin');
      navigate(destination, { replace: true });
    }
  }, [user, role, isLoading, location.search, navigate]);

  // Inspect URL parameters and hash fragments for Supabase errors
  useEffect(() => {
    document.title = 'Sign In — MockSignal';

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

      // Clean up URL hash and search params without triggering a reload
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

  const getTargetRedirectUrl = () => {
    const redirectParam = new URLSearchParams(location.search).get('redirect');
    return redirectParam
      ? `${window.location.origin}/login?redirect=${encodeURIComponent(redirectParam)}`
      : `${window.location.origin}/login`;
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

    const { error } = await signInWithMagicLink(email, getTargetRedirectUrl());
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

    const { error } = await signInWithMagicLink(email, getTargetRedirectUrl());
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
        {/* Brand Header */}
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

        {/* Configuration Notice (if placeholder keys) */}
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

        {/* Local Dev Instant Logins */}
        <DevQuickLogin onLogin={handleDevLogin} isSubmitting={isSubmitting} />

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          <AuthErrorBanner error={authError} />

          {isMagicLinkSent ? (
            <MagicLinkSentView
              email={email}
              cooldownSeconds={cooldownSeconds}
              isSubmitting={isSubmitting}
              onResend={handleResendMagicLink}
              onChangeEmail={() => {
                setIsMagicLinkSent(false);
                setAuthError(null);
              }}
            />
          ) : (
            <div className="space-y-6">
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                disabled={isSubmitting || !isConfigured}
              />

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium relative">
                  or with magic link
                </span>
              </div>

              <MagicLinkForm
                email={email}
                onEmailChange={setEmail}
                onSubmit={handleMagicLink}
                isSubmitting={isSubmitting}
                isConfigured={isConfigured}
                cooldownSeconds={cooldownSeconds}
              />
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
