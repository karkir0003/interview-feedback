import { Mail } from 'lucide-react';

interface MagicLinkSentViewProps {
  email: string;
  cooldownSeconds: number;
  isSubmitting: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
}

export function MagicLinkSentView({
  email,
  cooldownSeconds,
  isSubmitting,
  onResend,
  onChangeEmail,
}: MagicLinkSentViewProps) {
  return (
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
          onClick={onResend}
          disabled={cooldownSeconds > 0 || isSubmitting}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition"
        >
          {cooldownSeconds > 0
            ? `Resend link in ${cooldownSeconds}s`
            : "Didn't receive the email? Resend link"}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-xs text-slate-500 hover:text-slate-700 transition"
        >
          ← Use a different email
        </button>
      </div>
    </div>
  );
}

