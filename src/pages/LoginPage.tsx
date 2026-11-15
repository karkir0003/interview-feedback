import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Mail, Sparkles, AlertTriangle, ArrowRight, Loader2, Award, ShieldCheck, ClipboardCheck, User } from 'lucide-react';

export function LoginPage() {
  const { signInWithMagicLink, signInWithGoogle, signInWithPassword, isConfigured } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  useEffect(() => {
    document.title = 'Sign In — MockSignal';
  }, []);

  const handleDevLogin = async (targetEmail: string) => {
    setIsSubmitting(true);
    const { error } = await signInWithPassword(targetEmail, 'password123');
    setIsSubmitting(false);

    if (error) {
      showError('Dev login failed', error.message);
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

    setIsSubmitting(true);
    const { error } = await signInWithMagicLink(email);
    setIsSubmitting(false);

    if (error) {
      showError('Authentication failed', error.message);
    } else {
      setIsMagicLinkSent(true);
      success('Magic link dispatched!', `Check ${email} for your secure sign-in link.`);
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
        {import.meta.env.DEV && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                Local Dev Quick-Login
              </h3>
            </div>
            <p className="text-xs text-blue-800/80 mb-3.5">
              1-click instant login using pre-seeded test accounts (<code className="font-mono text-[11px] bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">password123</code>):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => handleDevLogin('admin@mocksignal.local')}
                disabled={isSubmitting}
                className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200/80 bg-white hover:bg-blue-50 text-left transition shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Admin</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">
                  admin@mocksignal.local
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('interviewer@mocksignal.local')}
                disabled={isSubmitting}
                className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200/80 bg-white hover:bg-blue-50 text-left transition shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                  <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Interviewer</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">
                  interviewer@mocksignal.local
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('candidate@mocksignal.local')}
                disabled={isSubmitting}
                className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200/80 bg-white hover:bg-blue-50 text-left transition shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Candidate</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">
                  candidate@mocksignal.local
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
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
              <button
                onClick={() => setIsMagicLinkSent(false)}
                className="mt-6 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
              >
                ← Use a different email
              </button>
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
                  disabled={isSubmitting || !isConfigured}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
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
};
