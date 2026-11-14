import { useState, useMemo, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { InterviewType, Question } from '../../types';
import { useToast } from '../common/Toast';
import { trackEvent } from '../../lib/analytics';
import { BookOpen, Plus, Search, Trash2, Loader2 } from 'lucide-react';

interface QuestionBankTabProps {
  interviewTypes: InterviewType[];
  allQuestions: Question[];
  setAllQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
}

export function QuestionBankTab({
  interviewTypes,
  allQuestions,
  setAllQuestions,
}: QuestionBankTabProps) {
  const { success, error: showError, info } = useToast();

  const [bankTrackId, setBankTrackId] = useState<string>(
    () => interviewTypes[0]?.id || ''
  );
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [isAddingToBank, setIsAddingToBank] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');

  const currentTrack = useMemo(
    () => interviewTypes.find((t) => t.id === bankTrackId) || interviewTypes[0] || null,
    [interviewTypes, bankTrackId]
  );

  const filteredQuestions = useMemo(() => {
    let list = allQuestions;
    if (bankTrackId) {
      list = list.filter((q) => q.interview_type_id === bankTrackId);
    }
    if (questionSearchQuery.trim()) {
      const q = questionSearchQuery.toLowerCase();
      list = list.filter((item) => item.title.toLowerCase().includes(q));
    }
    return list;
  }, [allQuestions, bankTrackId, questionSearchQuery]);

  const handleAddQuestionToBank = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestionInput.trim()) {
      showError('Question Title Required', 'Please enter a title for the new question');
      return;
    }
    const targetTrackId = bankTrackId || interviewTypes[0]?.id;
    if (!targetTrackId) {
      showError('Track Required', 'Please select an interview track first');
      return;
    }

    try {
      setIsAddingToBank(true);
      const { data, error } = await supabase
        .from('questions')
        .insert({
          interview_type_id: targetTrackId,
          title: newQuestionInput.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setAllQuestions((prev) => [...prev, data as Question]);
        setNewQuestionInput('');
        trackEvent('question_added_to_bank', { track: currentTrack?.name });
        success('Question Added', `"${data.title}" added to the bank`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Failed to add question:', e);
      showError('Failed to add question', e.message);
    } finally {
      setIsAddingToBank(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${title}"?`)) {
      return;
    }

    try {
      const { error: delError } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (delError) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ is_active: false })
          .eq('id', questionId);

        if (updateError) throw updateError;
        setAllQuestions((prev) => prev.filter((q) => q.id !== questionId));
        info('Question Archived', `"${title}" was archived to protect past evaluations.`);
      } else {
        setAllQuestions((prev) => prev.filter((q) => q.id !== questionId));
        success('Question Removed', `"${title}" has been deleted.`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      showError('Failed to delete question', e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Quick Add Question Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-600" />
          <span>Add New Question to Bank</span>
        </h2>

        <form onSubmit={handleAddQuestionToBank} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Select Interview Track *
            </label>
            <div className="flex flex-wrap gap-2">
              {interviewTypes.map((type) => {
                const isSelected = (bankTrackId || interviewTypes[0]?.id) === type.id;
                const count = allQuestions.filter((q) => q.interview_type_id === type.id).length;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBankTrackId(type.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span>{type.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Question / Prompt Title *
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newQuestionInput}
                onChange={(e) => setNewQuestionInput(e.target.value)}
                placeholder="e.g. Design Distributed Task Queue, STAR leadership story, etc."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isAddingToBank || !newQuestionInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 transition shrink-0"
              >
                {isAddingToBank ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add to Bank</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Existing Questions List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>
                {currentTrack ? currentTrack.name : 'All Tracks'} Questions ({filteredQuestions.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These questions populate the question combobox when grading interviews
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={questionSearchQuery}
              onChange={(e) => setQuestionSearchQuery(e.target.value)}
              placeholder="Search bank..."
              className="block w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition"
            />
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 space-y-2">
            <p className="font-medium text-slate-700">No questions found for this track.</p>
            <p className="text-xs text-slate-400">Use the form above to add questions to this track.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredQuestions.map((q) => {
              const track = interviewTypes.find((t) => t.id === q.interview_type_id);
              return (
                <div
                  key={q.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-3 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{q.title}</p>
                      <span className="text-[11px] text-slate-400">
                        {track ? track.name : 'Interview Track'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id, q.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete or archive question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

