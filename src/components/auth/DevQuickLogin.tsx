import { ShieldCheck, ClipboardCheck, User } from 'lucide-react';

interface DevQuickLoginProps {
  onLogin: (email: string) => void;
  isSubmitting?: boolean;
}

const DEV_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@mocksignal.local',
    icon: ShieldCheck,
    iconColor: 'text-purple-600',
  },
  {
    role: 'Interviewer',
    email: 'interviewer@mocksignal.local',
    icon: ClipboardCheck,
    iconColor: 'text-blue-600',
  },
  {
    role: 'Candidate',
    email: 'candidate@mocksignal.local',
    icon: User,
    iconColor: 'text-emerald-600',
  },
] as const;

export function DevQuickLogin({ onLogin, isSubmitting = false }: DevQuickLoginProps) {
  // In production builds, this component compiles away to null
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
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
        {DEV_ACCOUNTS.map(({ role, email, icon: Icon, iconColor }) => (
          <button
            key={email}
            type="button"
            onClick={() => onLogin(email)}
            disabled={isSubmitting}
            className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200/80 bg-white hover:bg-blue-50 text-left transition shadow-xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 group-hover:text-blue-700">
              <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
              <span>{role}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">
              {email}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

