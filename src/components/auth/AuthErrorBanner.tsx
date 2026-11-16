import { AlertCircle } from 'lucide-react';
import { FormattedAuthError } from '../../lib/auth-errors';

interface AuthErrorBannerProps {
  error: FormattedAuthError | null;
}

export function AuthErrorBanner({ error }: AuthErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in"
    >
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-950">{error.title}</p>
        <p className="mt-0.5 text-amber-800 leading-relaxed">{error.message}</p>
      </div>
    </div>
  );
}
