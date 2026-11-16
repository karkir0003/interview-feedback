import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../lib/analytics';
import { Award, ShieldCheck, Zap, ArrowRight, BarChart3 } from 'lucide-react';
import { GITHUB_REPO_URL } from '../lib/constants';

export function HomePage() {
  const { user, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    document.title = 'MockSignal — Calibrated Interview Feedback';
  }, []);

  if (!isLoading && user) {
    return <Navigate to={isAdmin ? '/admin' : '/history'} replace />;
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Hero badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <Award className="h-4 w-4" />
          <span>Calibrated 1-on-1 Mock Interview Platform</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Objective, Calibrated Feedback for{' '}
          <span className="text-blue-600">Technical Interviews</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          Standardized rubrics across DSA, LLD, AI-Enabled Coding, System Design, and Behavioral tracks. Share rich scorecards with zero-login magic links or track longitudinal growth over time.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            onClick={() => trackEvent('home_signin_cta_clicked')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
          >
            <span>Sign In to Access Scorecards</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('read_documentation_clicked')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
          >
            Read Documentation
          </a>
        </div>

        {/* Value proposition pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Calibrated 1–5 Rubrics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every score from 1 (Very Poor) to 5 (Exceptional) features explicit inline definitions to eliminate subjective grading variance.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Zero-PII Share Links</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidates access scorecards via unique, unguessable magic tokens with robots indexing disabled and zero internal PII exposed.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Longitudinal Growth</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidates signing in with their email automatically unlock historical progression across all past mock sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
