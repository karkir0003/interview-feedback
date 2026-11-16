import { Mail, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface MagicLinkFormProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isConfigured: boolean;
  cooldownSeconds: number;
}

export function MagicLinkForm({
  email,
  onEmailChange,
  onSubmit,
  isSubmitting,
  isConfigured,
  cooldownSeconds,
}: MagicLinkFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
            onChange={(e) => onEmailChange(e.target.value)}
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
  );
}
