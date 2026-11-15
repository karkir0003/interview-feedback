import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  InterviewType,
  RubricCriterion,
  Question,
  EvaluationWithScores,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { trackEvent } from '../lib/analytics';
import { Loader2, ClipboardCheck, BookOpen, Sliders } from 'lucide-react';
import { GradingFormTab } from '../components/admin/GradingFormTab';
import { QuestionBankTab } from '../components/admin/QuestionBankTab';
import { RubricStudioTab } from '../components/admin/RubricStudioTab';

export function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'grade' | 'questions' | 'rubrics' =
    tabParam === 'questions' ? 'questions' : tabParam === 'rubrics' ? 'rubrics' : 'grade';

  const setActiveTab = (tab: 'grade' | 'questions' | 'rubrics') => {
    if (tab === 'grade') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const { isAdmin } = useAuth();
  const { success, error: showError } = useToast();

  // Reference data from database
  const [interviewTypes, setInterviewTypes] = useState<InterviewType[]>([]);
  const [allCriteria, setAllCriteria] = useState<RubricCriterion[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [pastEvaluations, setPastEvaluations] = useState<EvaluationWithScores[]>([]);
  const [isLoadingRefData, setIsLoadingRefData] = useState(true);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Fetch initial reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      setIsLoadingRefData(true);

      const [typesRes, criteriaRes, questionsRes, evalsRes] = await Promise.all([
        supabase.from('interview_types').select('*').eq('is_active', true).order('display_order'),
        supabase.from('rubric_criteria').select('*').eq('is_active', true).order('display_order'),
        supabase.from('questions').select('*').eq('is_active', true).order('title'),
        supabase
          .from('evaluations')
          .select(`
            *,
            evaluation_scores (*),
            candidates (*)
          `)
          .order('interviewed_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      if (typesRes.data) {
        setInterviewTypes(typesRes.data as InterviewType[]);
      }

      if (criteriaRes.data) {
        setAllCriteria(criteriaRes.data as RubricCriterion[]);
      }

      if (questionsRes.data) {
        setAllQuestions(questionsRes.data as Question[]);
      }

      if (evalsRes.data) {
        setPastEvaluations(evalsRes.data as unknown as EvaluationWithScores[]);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Failed to load admin reference data:', e);
      showError('Failed to load initial data', e.message);
    } finally {
      setIsLoadingRefData(false);
    }
  }, [showError]);

  useEffect(() => {
    document.title =
      activeTab === 'questions'
        ? 'Question Bank — MockSignal'
        : activeTab === 'rubrics'
        ? 'Manage Rubrics — MockSignal'
        : 'Grade Interview — MockSignal';
  }, [activeTab]);

  // Route tab security gate: Rubric management is strictly restricted to Admins
  useEffect(() => {
    if (activeTab === 'rubrics' && !isAdmin && !isLoadingRefData) {
      showError('Restricted Access', 'The rubric calibration studio is restricted to administrators.');
      setActiveTab('grade');
    }
  }, [activeTab, isAdmin, isLoadingRefData, showError]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const copyPastLink = (token: string, id: string, trackName?: string) => {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(id);
    trackEvent('admin_scorecard_link_copied', {
      evaluation_id: id,
      track: trackName,
    });
    success('Link Copied!', 'Scorecard URL copied to clipboard.');
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  if (isLoadingRefData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading interview rubrics and questions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {activeTab === 'grade'
              ? 'Grade Mock Interview'
              : activeTab === 'questions'
              ? 'Question Bank'
              : 'Rubric Calibration Studio'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {activeTab === 'grade'
              ? 'Evaluate candidate performance against calibrated 1-5 rubrics and publish shareable scorecards.'
              : activeTab === 'questions'
              ? 'Manage reusable focus questions and prompts across technical interview tracks.'
              : 'Customize evaluation axes and calibrated 1–5 scale descriptions for interview tracks.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('grade')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'grade'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
            <span>Grade Interview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'questions'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span>Question Bank</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {allQuestions.length}
            </span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('rubrics')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'rubrics'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-4 w-4 text-blue-600" />
              <span>Manage Rubrics</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'grade' && (
        <GradingFormTab
          interviewTypes={interviewTypes}
          allCriteria={allCriteria}
          allQuestions={allQuestions}
          pastEvaluations={pastEvaluations}
          setAllQuestions={setAllQuestions}
          onEvaluationPublished={fetchReferenceData}
          copyPastLink={copyPastLink}
          copiedTokenId={copiedTokenId}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionBankTab
          interviewTypes={interviewTypes}
          allQuestions={allQuestions}
          setAllQuestions={setAllQuestions}
        />
      )}

      {activeTab === 'rubrics' && (
        <RubricStudioTab
          interviewTypes={interviewTypes}
          allCriteria={allCriteria}
          setAllCriteria={setAllCriteria}
          isAdmin={isAdmin}
          onNavigateToGrade={() => setActiveTab('grade')}
        />
      )}
    </div>
  );
}
