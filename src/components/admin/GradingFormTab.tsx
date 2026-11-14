import { useState, useEffect, useMemo, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import {
  InterviewType,
  RubricCriterion,
  Question,
  HireabilityVerdict,
  EvaluationWithScores,
} from '../../types';
import { useToast } from '../common/Toast';
import { FeedbackMarkdown } from '../common/FeedbackMarkdown';
import { HireabilityBadge } from '../common/Badges';
import { trackEvent } from '../../lib/analytics';
import confetti from 'canvas-confetti';
import {
  Send,
  Share2,
  User,
  CheckCircle2,
  Loader2,
  Layers,
  ExternalLink,
  History,
  Eye,
  PenLine,
  ClipboardCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Table,
  Maximize2,
  Minimize2,
  Copy,
  X,
  RotateCcw,
} from 'lucide-react';
import { SCALE_LABELS } from './RubricStudioTab';

interface GradingFormTabProps {
  interviewTypes: InterviewType[];
  allCriteria: RubricCriterion[];
  allQuestions: Question[];
  pastEvaluations: EvaluationWithScores[];
  setAllQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onEvaluationPublished: () => void;
  copyPastLink: (token: string, id: string) => void;
  copiedTokenId: string | null;
}

export function GradingFormTab({
  interviewTypes,
  allCriteria,
  allQuestions,
  pastEvaluations,
  setAllQuestions,
  onEvaluationPublished,
  copyPastLink,
  copiedTokenId,
}: GradingFormTabProps) {
  const { success, error: showError, info } = useToast();

  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [interviewDate, setInterviewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [questionMode, setQuestionMode] = useState<'select' | 'new'>('select');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [customQuestionTitle, setCustomQuestionTitle] = useState('');
  const [saveQuestionToBank, setSaveQuestionToBank] = useState(true);
  const [hireability, setHireability] = useState<HireabilityVerdict | null>(null);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [previewOverall, setPreviewOverall] = useState(false);

  // Criteria State
  const [criteriaState, setCriteriaState] = useState<
    Record<
      string,
      {
        score: number;
        justification: string;
        preview: boolean;
      }
    >
  >({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [rubricViewMode, setRubricViewMode] = useState<'cards' | 'table'>('cards');
  const [tableExpandedText, setTableExpandedText] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentScorecard, setRecentScorecard] = useState<{
    url: string;
    candidateName: string;
    candidateEmail: string;
  } | null>(null);

  // Proactively clear any legacy drafts from localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem('mock_rubric_admin_draft_v1');
      localStorage.removeItem('mock_rubric_admin_draft_v2');
      localStorage.removeItem('mock_rubric_admin_draft_v3');
      localStorage.removeItem('mock_rubric_admin_draft');
    } catch {
      // Ignore
    }
  }, []);

  // Active track object
  const currentType = useMemo(
    () => interviewTypes.find((t) => t.id === selectedTypeId) || null,
    [interviewTypes, selectedTypeId]
  );

  // Active track criteria
  const currentCriteria = useMemo(() => {
    if (!selectedTypeId) return [];
    return allCriteria.filter((c) => c.interview_type_id === selectedTypeId);
  }, [allCriteria, selectedTypeId]);

  // Questions filtered by active track
  const availableQuestions = useMemo(() => {
    if (!selectedTypeId) return [];
    return allQuestions.filter((q) => q.interview_type_id === selectedTypeId);
  }, [allQuestions, selectedTypeId]);

  // Sync criteria state when track or criteria changes (unscored by default)
  useEffect(() => {
    if (currentCriteria.length === 0) return;

    setCriteriaState((prev) => {
      const updated = { ...prev };
      for (const c of currentCriteria) {
        if (!updated[c.criterion_key]) {
          updated[c.criterion_key] = {
            score: 0, // Unscored by default (scoring is required)
            justification: '',
            preview: false,
          };
        }
      }
      return updated;
    });
  }, [currentCriteria]);

  // Track scored criteria count
  const scoredCriteriaCount = useMemo(() => {
    return currentCriteria.filter((c) => {
      const s = criteriaState[c.criterion_key]?.score;
      return typeof s === 'number' && s >= 1 && s <= 5;
    }).length;
  }, [currentCriteria, criteriaState]);

  const toggleCommentBox = (criterionKey: string) => {
    setOpenComments((prev) => ({
      ...prev,
      [criterionKey]: !prev[criterionKey],
    }));
  };

  const handleResetForm = () => {
    if (window.confirm('Are you sure you want to reset the evaluation form to a clean state?')) {
      setCandidateName('');
      setCandidateEmail('');
      setInterviewDate(new Date().toISOString().split('T')[0]);
      setSelectedTypeId('');
      setQuestionMode('select');
      setSelectedQuestionId('');
      setCustomQuestionTitle('');
      setHireability(null);
      setOverallFeedback('');
      setCriteriaState({});
      info('Form Reset', 'All selections and fields have been cleared.');
    }
  };

  const handleSubmitEvaluation = async (e: FormEvent) => {
    e.preventDefault();

    if (!candidateName.trim()) {
      showError('Candidate Name missing', 'Please enter the candidate’s name');
      return;
    }

    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      showError('Valid Email required', 'Please provide a valid candidate email');
      return;
    }

    if (!currentType) {
      showError('Select Interview Track', 'Please choose an interview type');
      return;
    }

    let finalQuestionTitle = '';
    let finalQuestionId: string | null = null;

    if (questionMode === 'select') {
      if (!selectedQuestionId) {
        showError('Question Required', 'Please select a question from the question bank (or choose Add Custom Question)');
        return;
      }
      const qObj = availableQuestions.find((q) => q.id === selectedQuestionId);
      finalQuestionTitle = qObj ? qObj.title : 'Technical Interview Question';
      finalQuestionId = selectedQuestionId;
    } else {
      if (!customQuestionTitle.trim()) {
        showError('Custom Question missing', 'Please enter the title or prompt of the question asked');
        return;
      }
      finalQuestionTitle = customQuestionTitle.trim();
    }

    if (!hireability) {
      showError('Hireability Verdict missing', 'Please choose an overall hireability verdict');
      return;
    }

    if (!overallFeedback.trim()) {
      showError('Overall Feedback missing', 'Please provide high-level qualitative feedback for the candidate');
      return;
    }

    // Verify all rubric criteria are rated 1–5
    const unscoredAxes: string[] = [];
    for (const c of currentCriteria) {
      const entry = criteriaState[c.criterion_key];
      if (!entry || !entry.score || entry.score < 1 || entry.score > 5) {
        unscoredAxes.push(c.label);
      }
    }

    if (unscoredAxes.length > 0) {
      showError(
        `Scoring Required (${unscoredAxes.length} missing)`,
        `Please rate all rubric criteria before submitting: ${unscoredAxes.slice(0, 3).join(', ')}${
          unscoredAxes.length > 3 ? ` and ${unscoredAxes.length - 3} more` : ''
        }`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = candidateEmail.trim().toLowerCase();

      // Step 1: Upsert candidate
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .upsert(
          {
            email: normalizedEmail,
            full_name: candidateName.trim(),
          },
          { onConflict: 'email' }
        )
        .select()
        .single();

      if (candidateError || !candidateData) {
        throw new Error(`Failed to save candidate: ${candidateError?.message}`);
      }

      // Step 2: Handle custom question insertion
      if (questionMode === 'new' && saveQuestionToBank && customQuestionTitle.trim()) {
        const { data: newQData, error: newQError } = await supabase
          .from('questions')
          .insert({
            interview_type_id: currentType.id,
            title: customQuestionTitle.trim(),
            is_active: true,
          })
          .select()
          .single();

        if (!newQError && newQData) {
          finalQuestionId = newQData.id;
          setAllQuestions((prev) => [...prev, newQData as Question]);
        }
      }

      // Step 3: Insert evaluations row
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          candidate_id: candidateData.id,
          interview_type_id: currentType.id,
          question_id: finalQuestionId,
          interview_type_name: currentType.name,
          question_title: finalQuestionTitle,
          hireability,
          overall_feedback: overallFeedback.trim(),
          interviewed_at: interviewDate,
        })
        .select()
        .single();

      if (evalError || !evalData) {
        throw new Error(`Failed to create evaluation: ${evalError?.message}`);
      }

      // Step 4: Bulk insert evaluation_scores matching database schema
      const scoresToInsert = currentCriteria.map((criterion) => {
        const state = criteriaState[criterion.criterion_key] || { score: 0, justification: '' };
        return {
          evaluation_id: evalData.id,
          criterion_key: criterion.criterion_key,
          criterion_label: criterion.label,
          score: state.score,
          justification: state.justification ? state.justification.trim() : '',
          display_order: criterion.display_order,
        };
      });

      const { error: scoresError } = await supabase
        .from('evaluation_scores')
        .insert(scoresToInsert);

      if (scoresError) {
        throw new Error(`Failed to save evaluation scores: ${scoresError.message}`);
      }

      const shareUrl = `${window.location.origin}/r/${evalData.public_token}`;

      // Step 5: Send email report via Cloudflare Pages Function
      try {
        const sendRes = await fetch('/api/send-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluationId: evalData.id,
            candidateEmail: normalizedEmail,
            candidateName: candidateName.trim(),
            interviewTypeName: currentType.name,
            questionTitle: finalQuestionTitle,
            publicToken: evalData.public_token,
          }),
        });

        if (!sendRes.ok) {
          const errResp = await sendRes.json().catch(() => ({}));
          console.warn('Email dispatch warning:', errResp);
        }
      } catch (emailErr) {
        console.warn('Failed to call send-report endpoint:', emailErr);
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore
      }

      trackEvent('evaluation_published', {
        track: currentType.name,
        verdict: hireability,
      });

      success(
        'Evaluation Published!',
        `Scorecard link copied to clipboard for ${normalizedEmail}`
      );

      setRecentScorecard({
        url: shareUrl,
        candidateName: candidateName.trim(),
        candidateEmail: normalizedEmail,
      });

      // Reset entire form to clean slate
      setCandidateName('');
      setCandidateEmail('');
      setInterviewDate(new Date().toISOString().split('T')[0]);
      setSelectedTypeId('');
      setQuestionMode('select');
      setSelectedQuestionId('');
      setCustomQuestionTitle('');
      setHireability(null);
      setOverallFeedback('');
      setCriteriaState({});

      onEvaluationPublished();
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Submission failed:', e);
      showError('Failed to publish evaluation', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Form Reset Action */}
      <div className="flex items-center justify-end -mt-4">
        <button
          type="button"
          onClick={handleResetForm}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Reset all form fields to a clean state"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Form
        </button>
      </div>

      {/* Recent Evaluation Published Inline Success Banner */}
      {recentScorecard && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Evaluation Published for {recentScorecard.candidateName}!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Direct candidate link copied to clipboard ({recentScorecard.candidateEmail}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(recentScorecard.url);
                success('Link Copied!', 'Scorecard URL copied to clipboard');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Link</span>
            </button>

            <a
              href={recentScorecard.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
            >
              <span>Open Scorecard</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setRecentScorecard(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100/60 transition"
              title="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grading Form */}
      <form noValidate onSubmit={handleSubmitEvaluation} className="space-y-8">
        {/* Candidate & Session Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span>Candidate & Session Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Candidate Full Name *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="block w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Candidate Email *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="e.g. alex.chen@example.com"
                  className="block w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Interview Date
              </label>
              <input
                type="date"
                required
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Track & Focus Question Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Interview Track & Focus Question</span>
              </h2>
              <p className="text-xs text-slate-500">
                Active track sets available rubric criteria and tracks question bank history.
              </p>
            </div>
          </div>

          {/* Track Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Select Interview Track *
              </label>
              {!selectedTypeId ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                  Selection Required *
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                  Track Selected ✓
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {interviewTypes.map((type) => {
                const isSelected = selectedTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      if (selectedTypeId !== type.id) {
                        setSelectedTypeId(type.id);
                        setSelectedQuestionId('');
                        setCustomQuestionTitle('');
                        // Clean unscored state for the newly selected track
                        const newCriteria = allCriteria.filter((c) => c.interview_type_id === type.id);
                        const freshState: Record<string, { score: number; justification: string; preview: boolean }> = {};
                        for (const c of newCriteria) {
                          freshState[c.criterion_key] = { score: 0, justification: '', preview: false };
                        }
                        setCriteriaState(freshState);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Selection */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Question / Problem *
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setQuestionMode('select')}
                  className={`font-semibold pb-0.5 border-b-2 transition ${
                    questionMode === 'select'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Select from Bank ({availableQuestions.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setQuestionMode('new')}
                  className={`font-semibold pb-0.5 border-b-2 transition ${
                    questionMode === 'new'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  + Add Custom Question
                </button>
              </div>
            </div>

            {!selectedTypeId ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                Please select an interview track above first to populate questions.
              </div>
            ) : questionMode === 'select' ? (
              <div>
                {availableQuestions.length > 0 ? (
                  <select
                    value={selectedQuestionId}
                    onChange={(e) => setSelectedQuestionId(e.target.value)}
                    className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">-- Choose a Question from Bank * --</option>
                    {availableQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                    No questions saved for this track yet. Switch to "Add Custom Question" above.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={customQuestionTitle}
                  onChange={(e) => setCustomQuestionTitle(e.target.value)}
                  placeholder="e.g. Design YouTube Video Processing Pipeline"
                  className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={saveQuestionToBank}
                    onChange={(e) => setSaveQuestionToBank(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Save this question to reusable track bank for future mock sessions</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Overall Verdict & Executive Summary (TLDR) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Executive Summary & Overall Verdict (TLDR)
              </h2>
              <p className="text-xs text-slate-500">
                This overall verdict and high-level synthesis is featured right at the top of the candidate's scorecard.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
              Candidate TLDR
            </span>
          </div>

          {/* Hireability Verdict Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Overall Hireability Verdict *
              </label>
              {!hireability ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                  Selection Required *
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                  Verdict Selected ✓
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['No Hire', 'Partial Hire', 'Hire', 'Strong Hire'] as HireabilityVerdict[]).map(
                (v) => {
                  const isSelected = hireability === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setHireability(v)}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition text-center ${
                        isSelected
                          ? v === 'Strong Hire'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                            : v === 'Hire'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : v === 'Partial Hire'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {v}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Overall Feedback Markdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Overall Feedback & Next Steps (Markdown) *
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewOverall(false)}
                  className={`inline-flex items-center gap-1 font-semibold pb-0.5 border-b-2 transition ${
                    !previewOverall
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PenLine className="h-3 w-3" />
                  <span>Write</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setPreviewOverall(true)}
                  className={`inline-flex items-center gap-1 font-semibold pb-0.5 border-b-2 transition ${
                    previewOverall
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {!previewOverall ? (
              <textarea
                rows={5}
                required
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="High-level synthesis: candidate strengths, high-priority areas to practice, resource recommendations..."
                className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-xs leading-relaxed"
              />
            ) : (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 min-h-[120px]">
                <FeedbackMarkdown content={overallFeedback} />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Rubric Criteria Scoring Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                <span>Rubric Axis Scoring ({currentType ? currentType.name : 'Choose Track'})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Score each criterion on a calibrated 1–5 scale. Specific justification notes are optional but recommended.
              </p>
            </div>

            {/* View Mode Switcher and Scored Counter */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {currentCriteria.length > 0 && (
                <div
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                    scoredCriteriaCount === currentCriteria.length
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                      : 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  }`}
                >
                  {scoredCriteriaCount === currentCriteria.length ? (
                    <span>All {currentCriteria.length} Scored ✓</span>
                  ) : (
                    <span>
                      {scoredCriteriaCount}/{currentCriteria.length} Scored (Required)
                    </span>
                  )}
                </div>
              )}

              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setRubricViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    rubricViewMode === 'cards'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Card View: Full descriptions, spacious"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRubricViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                    rubricViewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Matrix Grid View: Compare all 1-5 levels across rows"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Matrix Grid</span>
                </button>
              </div>
            </div>
          </div>

          {!selectedTypeId ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Interview Track Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Please select an interview track above (e.g. DSA / LeetCode, LLD Coding, System Design) to load its calibrated scoring rubrics.
              </p>
            </div>
          ) : currentCriteria.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              No active rubric criteria found for this track. Configure criteria in Supabase.
            </div>
          ) : rubricViewMode === 'cards' ? (
            /* Cards View */
            <div className="space-y-4">
              {currentCriteria.map((criterion, idx) => {
                const state = criteriaState[criterion.criterion_key] || {
                  score: 0,
                  justification: '',
                  preview: false,
                };
                const isOpen = Boolean(openComments[criterion.criterion_key]);
                const isCriterionScored = state.score >= 1 && state.score <= 5;

                return (
                  <div
                    key={criterion.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 transition hover:border-slate-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{criterion.label}</h3>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {criterion.criterion_key}
                          </span>
                        </div>
                      </div>

                      {/* Current Score Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {!isCriterionScored ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 uppercase tracking-wider animate-pulse">
                            Score Required *
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                            <span className="text-blue-600 font-mono">Selected: {state.score}/5</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{SCALE_LABELS[state.score]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 1–5 Radio Card Selector with calibrated descriptions */}
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {[1, 2, 3, 4, 5].map((lvl) => {
                          const isSelected = state.score === lvl;
                          const desc = criterion.scale_descriptions?.[String(lvl)];

                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => {
                                setCriteriaState((prev) => ({
                                  ...prev,
                                  [criterion.criterion_key]: {
                                    ...state,
                                    score: lvl,
                                  },
                                }));
                              }}
                              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition ${
                                isSelected
                                  ? lvl >= 4
                                    ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                    : lvl === 3
                                    ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                                    : 'bg-rose-50/70 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span
                                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                    isSelected
                                      ? lvl >= 4
                                        ? 'bg-emerald-600 text-white'
                                        : lvl === 3
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-rose-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {lvl} • {SCALE_LABELS[lvl]}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>

                              <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-4">
                                {desc || <span className="italic text-slate-400">No description provided</span>}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Criterion Specific Justification Drawer */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleCommentBox(criterion.criterion_key)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {isOpen ? 'Hide Axis Justification Note' : 'Add Axis Justification Note'}
                          </span>
                          {state.justification && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                          )}
                          {isOpen ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Specific evidence, examples from code, or reasoning for this criterion:
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() =>
                                  setCriteriaState((prev) => ({
                                    ...prev,
                                    [criterion.criterion_key]: { ...state, preview: false },
                                  }))
                                }
                                className={`text-[11px] font-semibold pb-0.5 border-b-2 transition ${
                                  !state.preview
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500'
                                }`}
                              >
                                Write
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCriteriaState((prev) => ({
                                    ...prev,
                                    [criterion.criterion_key]: { ...state, preview: true },
                                  }))
                                }
                                className={`text-[11px] font-semibold pb-0.5 border-b-2 transition ${
                                  state.preview
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500'
                                }`}
                              >
                                Preview
                              </button>
                            </div>
                          </div>

                          {!state.preview ? (
                            <textarea
                              rows={3}
                              value={state.justification}
                              onChange={(e) =>
                                setCriteriaState((prev) => ({
                                  ...prev,
                                  [criterion.criterion_key]: {
                                    ...state,
                                    justification: e.target.value,
                                  },
                                }))
                              }
                              placeholder="e.g. Solution ran in O(N) time with HashMap, candidate verified corner cases cleanly..."
                              className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed font-mono"
                            />
                          ) : (
                            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs min-h-[70px]">
                              <FeedbackMarkdown
                                content={state.justification || '_No notes written yet._'}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Matrix Grid View */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Full 1–5 Rubric Matrix for {currentType?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setTableExpandedText(!tableExpandedText)}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                >
                  {tableExpandedText ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>Compact Matrix</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Expand All Descriptions</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4 w-44">Evaluation Axis</th>
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <th key={lvl} className="py-3 px-3 w-1/5 text-center">
                          <span className="block font-mono text-xs">{lvl}</span>
                          <span className="font-normal text-[10px] text-slate-500">
                            {SCALE_LABELS[lvl]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {currentCriteria.map((criterion, idx) => {
                      const state = criteriaState[criterion.criterion_key] || {
                        score: 0,
                        justification: '',
                        preview: false,
                      };
                      const isOpen = Boolean(openComments[criterion.criterion_key]);
                      const isCriterionScored = state.score >= 1 && state.score <= 5;

                      return (
                        <tr key={criterion.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-4 align-top font-semibold text-slate-900 border-r border-slate-100 bg-slate-50/30">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 font-mono text-[10px] flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold">{criterion.label}</span>
                            </div>

                            <div className="mt-1">
                              {!isCriterionScored ? (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                                  Required *
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-blue-600 font-mono">
                                  Selected: {state.score}/5
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleCommentBox(criterion.criterion_key)}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>{isOpen ? 'Close note' : 'Add note'}</span>
                            </button>
                          </td>

                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const isSelected = state.score === lvl;
                            const desc = criterion.scale_descriptions?.[String(lvl)];

                            return (
                              <td
                                key={lvl}
                                onClick={() => {
                                  setCriteriaState((prev) => ({
                                    ...prev,
                                    [criterion.criterion_key]: {
                                      ...state,
                                      score: lvl,
                                    },
                                  }));
                                }}
                                className={`py-3 px-3 align-top cursor-pointer transition border-r border-slate-100 last:border-r-0 ${
                                  isSelected
                                    ? lvl >= 4
                                      ? 'bg-emerald-50/90 text-emerald-950 font-medium'
                                      : lvl === 3
                                      ? 'bg-blue-50/90 text-blue-950 font-medium'
                                      : 'bg-rose-50/90 text-rose-950 font-medium'
                                    : 'hover:bg-slate-100/70 text-slate-600'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span
                                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      isSelected
                                        ? lvl >= 4
                                          ? 'bg-emerald-600 text-white'
                                          : lvl === 3
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-rose-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    Level {lvl}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2
                                      className={`h-4 w-4 ${
                                        lvl >= 4
                                          ? 'text-emerald-600'
                                          : lvl === 3
                                          ? 'text-blue-600'
                                          : 'text-rose-600'
                                      }`}
                                    />
                                  )}
                                </div>
                                <p
                                  className={`text-[11px] leading-relaxed ${
                                    tableExpandedText ? '' : 'line-clamp-3'
                                  }`}
                                >
                                  {desc || <span className="italic text-slate-400">No definition</span>}
                                </p>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Clicking publish immediately creates a shareable URL and sends an email report to the candidate.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing Evaluation...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Publish & Email Scorecard</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Past Evaluations Feed Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            <span>Recent Evaluated Sessions ({pastEvaluations.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Latest 30 submissions</span>
        </div>

        {pastEvaluations.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No evaluations completed yet. Fill out the form above to grade your first candidate!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Track</th>
                  <th className="py-2.5 px-3">Question</th>
                  <th className="py-2.5 px-3">Verdict</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastEvaluations.map((ev) => {
                  const candidateName = ev.candidates ? ev.candidates.full_name : 'Unknown Candidate';
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {ev.interviewed_at}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {candidateName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap text-xs">
                        {ev.interview_type_name}
                      </td>
                      <td className="py-3 px-3 text-slate-800 text-xs max-w-xs truncate">
                        {ev.question_title}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <HireabilityBadge verdict={ev.hireability} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyPastLink(ev.public_token, ev.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Copy public scorecard link"
                          >
                            {copiedTokenId === ev.id ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="h-3 w-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`/r/${ev.public_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-700 transition"
                            title="Open scorecard in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

