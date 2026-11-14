import { HireabilityVerdict } from '../../types';

interface HireabilityBadgeProps {
  verdict: HireabilityVerdict;
  size?: 'sm' | 'md' | 'lg';
}

export function HireabilityBadge({
  verdict,
  size = 'md',
}: HireabilityBadgeProps) {
  const getStyles = () => {
    switch (verdict) {
      case 'Strong Hire':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Hire':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Partial Hire':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'No Hire':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1 font-medium',
    lg: 'text-base px-4 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${getStyles()} ${sizeClasses[size]}`}
    >
      {verdict}
    </span>
  );
};

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const getScoreColor = (val: number) => {
    if (val >= 4.5) return 'bg-emerald-600 text-white';
    if (val >= 3.5) return 'bg-teal-600 text-white';
    if (val >= 2.5) return 'bg-blue-600 text-white';
    if (val >= 1.8) return 'bg-amber-500 text-white';
    return 'bg-rose-600 text-white';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-semibold',
    md: 'text-sm px-2.5 py-1 font-bold',
    lg: 'text-base px-3.5 py-1.5 font-extrabold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-mono shadow-sm ${getScoreColor(score)} ${sizeClasses[size]}`}
    >
      {score.toFixed(score % 1 === 0 ? 0 : 1)} / 5
    </span>
  );
};

interface ScoreProgressBarProps {
  score: number;
  max?: number;
}

export function ScoreProgressBar({ score, max = 5 }: ScoreProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));

  const getBarColor = (val: number) => {
    if (val >= 4.5) return 'bg-emerald-500';
    if (val >= 3.5) return 'bg-teal-500';
    if (val >= 2.5) return 'bg-blue-500';
    if (val >= 1.8) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-all duration-300 ${getBarColor(score)}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
