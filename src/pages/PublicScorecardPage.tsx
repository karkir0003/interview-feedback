import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicScorecard, RubricCriterion } from '../types';
import { FeedbackMarkdown } from '../components/common/FeedbackMarkdown';
import { HireabilityBadge, ScoreBadge, ScoreProgressBar } from '../components/common/Badges';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../lib/analytics';
import { buildStripeTipUrl } from '../lib/constants';
import {
  Calendar,
  Share2,
  CheckCircle,
  FileQuestion,
  Sparkles,
  ArrowRight,
  Loader2,
  Award,
  Layers,
  ChevronDown,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

const SCALE_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Below Bar',
  3: 'Meets Bar',
  4: 'Strong',
  5: 'Exceptional',
};

const CRITERION_EXPLANATIONS: Record<string, string> = {
  optimality: 'Evaluates algorithmic optimality, mathematical invariants, edge case boundaries, and clean problem solving.',
  communication: 'Evaluates structured alignment, clarity of thought, narrating trade-offs, and active interviewer collaboration.',
  ds_language: 'Evaluates idiomatic language proficiency, clean abstractions, and choosing the right standard library data structures.',
  complexity: 'Evaluates precision in deriving Big-O time and space complexity, memory footprints, and CPU/memory trade-offs.',
  product_system: 'Evaluates practical engineering pragmatism, real-world failure mode awareness, concurrency, and extensibility.',
  ai_fluency: 'Evaluates effective prompt decomposition, critical verification of AI output, and rapid human-AI coding iteration.',
  requirements: 'Evaluates structured scope framing, clarifying functional/non-functional constraints, and capacity math.',
  architecture: 'Evaluates high-level system decomposition, service boundaries, data schemas, and end-to-end data flow.',
  scalability: 'Evaluates handling system growth, bottlenecks, partitioning, caching, asynchronous queues, and fault tolerance.',
  star_clarity: 'Evaluates narrative structure (Situation, Task, Action, Result), conciseness, and quantified impact.',
  ownership: 'Evaluates proactive agency, driving resolution under ambiguity, unblocking dependencies, and end-to-end impact.',
  collaboration: 'Evaluates navigating disagreement, building consensus with empathy and data, and elevating team peers.',
};

export function PublicScorecardPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { success } = useToast();

  const [scorecard, setScorecard] = useState<PublicScorecard | null>(null);
  const [criteriaMap, setCriteriaMap] = useState<Record<string, RubricCriterion>>({});
  const [expandedScale, setExpandedScale] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stripeTipUrl = useMemo(() => buildStripeTipUrl('web', 'stripe_tip_scorecard'), []);

  const toggleScale = (key: string) => {
    setExpandedScale((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allExpanded = useMemo(() => {
    if (!scorecard || !scorecard.scores || scorecard.scores.length === 0) return false;
    return scorecard.scores.every((s) => Boolean(expandedScale[s.criterion_key]));
  }, [scorecard, expandedScale]);

  const toggleAllScale = () => {
    if (!scorecard || !scorecard.scores) return;
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    for (const s of scorecard.scores) {
      updated[s.criterion_key] = nextState;
    }
    setExpandedScale(updated);
  };

  // Set robots noindex tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
      created = true;
    } else {
      meta.content = 'noindex, nofollow';
    }

    return () => {
      if (created && meta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, []);

  // Fetch scorecard using the SECURITY DEFINER RPC
  useEffect(() => {
    const fetchScorecard = async () => {
      if (!token) {
        setError('Missing evaluation token');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [{ data, error: rpcError }, criteriaRes] = await Promise.all([
          supabase.rpc('get_evaluation_by_token', { p_token: token }),
          supabase.from('rubric_criteria').select('*').eq('is_active', true),
        ]);

        if (criteriaRes.data) {
          const map: Record<string, RubricCriterion> = {};
          for (const c of criteriaRes.data as RubricCriterion[]) {
            map[c.criterion_key] = c;
          }
          setCriteriaMap(map);
        }

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          setError('Evaluation not found or invalid token');
        } else if (!data || !(data as PublicScorecard).id) {
          setError('Evaluation scorecard not found');
        } else {
          const cardData = data as unknown as PublicScorecard;
          setScorecard(cardData);
          if (cardData.candidate_name) {
            document.title = `${cardData.candidate_name}'s Scorecard — MockSignal`;
          }
          trackEvent('scorecard_viewed', {
            track: cardData.interview_type_name,
            verdict: cardData.hireability,
          });
        }
      } catch (err: unknown) {
        const e = err as Error;
        console.error('Error fetching evaluation:', e);
        setError(e.message || 'Failed to load evaluation scorecard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScorecard();
  }, [token]);

  // Calculate overall average score
  const averageScore = useMemo(() => {
    if (!scorecard || !scorecard.scores || scorecard.scores.length === 0) return 0;
    const sum = scorecard.scores.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Number((sum / scorecard.scores.length).toFixed(1));
  }, [scorecard]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    trackEvent('scorecard_link_copied', {
      track: scorecard?.interview_type_name,
    });
    success('Scorecard link copied!', 'Direct link ready to share.');
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading your interview scorecard...</p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Scorecard Not Found</h2>
          <p className="text-sm text-slate-600 mt-2">
            The scorecard link you followed may be invalid, expired, or hasn't been published yet.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Return Home
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              Sign In with Email
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Banner (Unauthenticated) */}
      {!user && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-5 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Done multiple mock interviews?</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  Sign in with your email to unlock your full historical score progression and longitudinal trends.
                </p>
              </div>
            </div>
            <Link
              to="/login?redirect=/history"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-blue-950 hover:bg-blue-50 shadow-sm transition shrink-0"
            >
              <span>Sign in with Email</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <Layers className="h-3.5 w-3.5" />
                {scorecard.interview_type_name}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(scorecard.interviewed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {scorecard.candidate_name}'s Evaluation
            </h1>
            <p className="text-base text-slate-600 mt-1 font-medium">
              Problem / Focus: <span className="text-slate-800">{scorecard.question_title}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
              title="Copy scorecard public link"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-slate-500" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verdict & Average Score Metrics (TLDR) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Verdict</p>
              <div className="mt-2">
                <HireabilityBadge verdict={scorecard.hireability} size="lg" />
              </div>
            </div>
            <Award className="h-10 w-10 text-slate-300 stroke-1" />
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Rubric Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {averageScore.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-500">/ 5.0</span>
              </div>
            </div>
            <div className="w-24">
              <ScoreProgressBar score={averageScore} />
            </div>
          </div>
        </div>

        {/* TLDR: Overall Feedback & Next Steps */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Executive Summary & Key Takeaways
            </h2>
          </div>
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/60">
            <FeedbackMarkdown
              content={scorecard.overall_feedback}
              placeholder="No high-level feedback provided."
            />
          </div>
        </div>
      </div>

      {/* Axis Breakdown Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Detailed Rubric Breakdown</span>
              <span className="text-xs font-normal text-slate-500">({scorecard.scores.length} axes evaluated)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review calibrated benchmarks, scoring standards, and interviewer observations for each competency.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAllScale}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition self-start sm:self-auto shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>{allExpanded ? 'Collapse All Rubric Scales' : 'Expand All Rubric Scales (1–5)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {scorecard.scores.map((scoreItem) => {
            const criterion = criteriaMap[scoreItem.criterion_key];
            const achievedDesc = criterion?.scale_descriptions?.[String(scoreItem.score)];
            const isScaleExpanded = Boolean(expandedScale[scoreItem.criterion_key]);
            const axisSummary = CRITERION_EXPLANATIONS[scoreItem.criterion_key];

            return (
              <div
                key={scoreItem.criterion_key}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition hover:border-slate-300 space-y-4"
              >
                {/* Criterion Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3.5 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {scoreItem.criterion_label}
                    </h3>
                    {axisSummary && (
                      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                        <span className="font-semibold text-slate-700">What this evaluates:</span> {axisSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 hidden sm:block">
                      <ScoreProgressBar score={scoreItem.score} />
                    </div>
                    <ScoreBadge score={scoreItem.score} size="md" />
                  </div>
                </div>

                {/* Achieved Score Calibration Definition */}
                {achievedDesc ? (
                  <div className="rounded-xl p-4 bg-blue-50/80 border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[11px] font-extrabold shadow-xs">
                          {scoreItem.score}
                        </span>
                        <span>
                          What your score means ({SCALE_LABELS[scoreItem.score] || 'Level ' + scoreItem.score}):
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded uppercase tracking-wider">
                        Calibrated Benchmark
                      </span>
                    </div>
                    <p className="text-xs text-blue-950 font-medium leading-relaxed pl-7">
                      {achievedDesc}
                    </p>
                  </div>
                ) : null}

                {/* Expandable 1–5 Calibration Benchmarks */}
                {criterion?.scale_descriptions && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleScale(scoreItem.criterion_key)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                      <span>{isScaleExpanded ? 'Hide full 1–5 rubric levels' : 'Explore full 1–5 rubric levels & benchmarks'}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isScaleExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isScaleExpanded && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        {[1, 2, 3, 4, 5].map((lvl) => {
                          const isYourScore = scoreItem.score === lvl;
                          const desc = criterion.scale_descriptions[String(lvl)];

                          return (
                            <div
                              key={lvl}
                              className={`p-3 rounded-xl border text-xs space-y-2 transition flex flex-col justify-between ${
                                isYourScore
                                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-sm text-blue-950'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                      isYourScore
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    Level {lvl} • {SCALE_LABELS[lvl]}
                                  </span>
                                  {isYourScore && (
                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 py-0.5 rounded uppercase tracking-wider">
                                      Achieved
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  {desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Justification content */}
                {scoreItem.justification ? (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Interviewer Observations & Notes
                    </p>
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
                      <FeedbackMarkdown content={scoreItem.justification} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Supporter Tip Card */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/50 border border-amber-200/90 p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">💸</span>
              <h3 className="text-base font-bold text-slate-900">
                Enjoyed the session?
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Feel free to leave a{' '}
              <a
                href={stripeTipUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('tip_button_clicked', { platform: 'stripe', source: 'inline_link' })}
                className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
              >
                tip
              </a>{' '}
              — it helps support the time and care I put into each 1:1.
            </p>
          </div>
          <a
            href={stripeTipUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('tip_button_clicked', { platform: 'stripe', source: 'cta_button' })}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-sm shadow-sm transition-all duration-150 shrink-0 border border-amber-400"
          >
            <span>Leave a Tip 💸</span>
            <ExternalLink className="h-4 w-4 text-slate-950" />
          </a>
        </div>
      </div>
    </div>
  );
};
