import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EvaluationWithScores } from '../types';
import { HireabilityBadge, ScoreBadge, ScoreProgressBar } from '../components/common/Badges';
import {
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Award,
  Inbox,
  Loader2,
  BarChart2,
} from 'lucide-react';

export function CandidateHistoryPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<EvaluationWithScores[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'My Mock Interviews — MockSignal';
    const fetchCandidateHistory = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch evaluations with nested scores.
        // RLS automatically filters to candidate_id corresponding to user's email.
        const { data, error: fetchError } = await supabase
          .from('evaluations')
          .select(`
            *,
            evaluation_scores (*)
          `)
          .order('interviewed_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setEvaluations((data as unknown as EvaluationWithScores[]) || []);
      } catch (err: unknown) {
        const e = err as Error;
        console.error('Failed to load candidate evaluations:', e);
        setError(e.message || 'Unable to retrieve your evaluations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidateHistory();
  }, [user]);

  // Overall Average Score calculation across all evaluations and axes
  const overallMetrics = useMemo(() => {
    if (evaluations.length === 0) {
      return { totalSessions: 0, overallAvg: 0, axisAverages: [] };
    }

    let totalScoreSum = 0;
    let totalScoreCount = 0;
    const axisMap: Record<
      string,
      {
        label: string;
        sum: number;
        count: number;
      }
    > = {};

    for (const ev of evaluations) {
      if (ev.evaluation_scores) {
        for (const s of ev.evaluation_scores) {
          totalScoreSum += s.score;
          totalScoreCount += 1;

          if (!axisMap[s.criterion_key]) {
            axisMap[s.criterion_key] = {
              label: s.criterion_label,
              sum: 0,
              count: 0,
            };
          }
          axisMap[s.criterion_key].sum += s.score;
          axisMap[s.criterion_key].count += 1;
        }
      }
    }

    const overallAvg =
      totalScoreCount > 0 ? Number((totalScoreSum / totalScoreCount).toFixed(1)) : 0;

    const axisAverages = Object.entries(axisMap).map(([key, data]) => ({
      key,
      label: data.label,
      avg: Number((data.sum / data.count).toFixed(1)),
      count: data.count,
    })).sort((a, b) => b.avg - a.avg);

    return {
      totalSessions: evaluations.length,
      overallAvg,
      axisAverages,
    };
  }, [evaluations]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Retrieving your mock interview history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Mock Interview Progression
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Track your calibrated rubric scores, feedback history, and technical growth over time.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
            Account: <strong className="text-slate-700">{user?.email}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
          {error}
        </div>
      )}

      {evaluations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Inbox className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No mock interview records yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Once an interviewer publishes a scorecard for <strong>{user?.email}</strong>, it will automatically populate your longitudinal dashboard here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Sessions
                </p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                  {overallMetrics.totalSessions}
                </p>
                <p className="text-xs text-slate-500 mt-1">Completed mock interviews</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Overall Average Score
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    {overallMetrics.overallAvg.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/ 5.0</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Across all calibrated axes</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Top Evaluated Skill
                </p>
                <p className="text-base font-bold text-slate-900 mt-1 truncate max-w-[200px]">
                  {overallMetrics.axisAverages[0]?.label || 'General'}
                </p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  {overallMetrics.axisAverages[0]
                    ? `${overallMetrics.axisAverages[0].avg.toFixed(1)} / 5.0 Average`
                    : 'Awaiting scores'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Longitudinal Axis Breakdown */}
          {overallMetrics.axisAverages.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-blue-600" />
                  <span>Longitudinal Performance by Rubric Axis</span>
                </h2>
                <span className="text-xs text-slate-500">Average across all sessions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {overallMetrics.axisAverages.map((axis) => (
                  <div
                    key={axis.key}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{axis.label}</span>
                      <ScoreBadge score={axis.avg} size="sm" />
                    </div>
                    <ScoreProgressBar score={axis.avg} />
                    <p className="text-[11px] text-slate-400">
                      Evaluated {axis.count} {axis.count === 1 ? 'time' : 'times'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Evaluations Cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Mock Interview Sessions ({evaluations.length})
            </h2>

            <div className="space-y-4">
              {evaluations.map((ev) => {
                const sessionAvg =
                  ev.evaluation_scores && ev.evaluation_scores.length > 0
                    ? Number(
                        (
                          ev.evaluation_scores.reduce((a, b) => a + b.score, 0) /
                          ev.evaluation_scores.length
                        ).toFixed(1)
                      )
                    : 0;

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition hover:border-slate-300 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {ev.interview_type_name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(ev.interviewed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {ev.question_title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <HireabilityBadge verdict={ev.hireability} size="md" />
                        <ScoreBadge score={sessionAvg} size="md" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-md">
                        {ev.overall_feedback || 'No high-level notes'}
                      </p>

                      <Link
                        to={`/r/${ev.public_token}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm shrink-0"
                      >
                        <span>View Full Rubric</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
