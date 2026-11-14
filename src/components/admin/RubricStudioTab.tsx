import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { InterviewType, RubricCriterion } from '../../types';
import { useToast } from '../common/Toast';
import { trackEvent } from '../../lib/analytics';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  PenLine,
  CheckCircle2,
  X,
} from 'lucide-react';

export const SCALE_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Below Bar',
  3: 'Meets Bar',
  4: 'Strong',
  5: 'Exceptional',
};

interface RubricStudioTabProps {
  interviewTypes: InterviewType[];
  allCriteria: RubricCriterion[];
  setAllCriteria: React.Dispatch<React.SetStateAction<RubricCriterion[]>>;
  isAdmin: boolean;
  onNavigateToGrade: () => void;
}

export function RubricStudioTab({
  interviewTypes,
  allCriteria,
  setAllCriteria,
  isAdmin,
  onNavigateToGrade,
}: RubricStudioTabProps) {
  const { success, error: showError } = useToast();

  const [rubricTrackId, setRubricTrackId] = useState<string>(
    () => interviewTypes[0]?.id || ''
  );
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [editCriterionForm, setEditCriterionForm] = useState<{
    label: string;
    scale_descriptions: Record<string, string>;
  }>({
    label: '',
    scale_descriptions: { '1': '', '2': '', '3': '', '4': '', '5': '' },
  });
  const [isSavingRubric, setIsSavingRubric] = useState(false);

  const rubricCriteria = useMemo(() => {
    if (!rubricTrackId) return [];
    return allCriteria
      .filter((c) => c.interview_type_id === rubricTrackId)
      .sort((a, b) => a.display_order - b.display_order);
  }, [allCriteria, rubricTrackId]);

  const handleStartEditCriterion = (criterion: RubricCriterion) => {
    setEditingCriterionId(criterion.id);
    setEditCriterionForm({
      label: criterion.label,
      scale_descriptions: {
        '1': criterion.scale_descriptions?.['1'] || '',
        '2': criterion.scale_descriptions?.['2'] || '',
        '3': criterion.scale_descriptions?.['3'] || '',
        '4': criterion.scale_descriptions?.['4'] || '',
        '5': criterion.scale_descriptions?.['5'] || '',
      },
    });
  };

  const handleCancelEditCriterion = () => {
    setEditingCriterionId(null);
  };

  const handleSaveCriterion = async () => {
    if (!isAdmin) {
      showError('Permission Denied', 'Only administrators are authorized to update rubric definitions.');
      return;
    }
    if (!editingCriterionId) return;
    if (!editCriterionForm.label.trim()) {
      showError('Validation Error', 'Rubric axis label cannot be empty.');
      return;
    }

    try {
      setIsSavingRubric(true);
      const updatedScales = {
        '1': editCriterionForm.scale_descriptions['1']?.trim() || '',
        '2': editCriterionForm.scale_descriptions['2']?.trim() || '',
        '3': editCriterionForm.scale_descriptions['3']?.trim() || '',
        '4': editCriterionForm.scale_descriptions['4']?.trim() || '',
        '5': editCriterionForm.scale_descriptions['5']?.trim() || '',
      };

      const { error } = await supabase
        .from('rubric_criteria')
        .update({
          label: editCriterionForm.label.trim(),
          scale_descriptions: updatedScales,
        })
        .eq('id', editingCriterionId);

      if (error) {
        throw error;
      }

      setAllCriteria((prev) =>
        prev.map((c) =>
          c.id === editingCriterionId
            ? {
                ...c,
                label: editCriterionForm.label.trim(),
                scale_descriptions: updatedScales,
              }
            : c
        )
      );

      trackEvent('rubric_calibrated', {
        axis: editCriterionForm.label.trim(),
      });

      success('Rubric Updated', `"${editCriterionForm.label.trim()}" calibration definitions saved successfully.`);
      setEditingCriterionId(null);
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Failed to update rubric criteria:', e);
      showError('Update Failed', e.message || 'Could not save rubric changes.');
    } finally {
      setIsSavingRubric(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm animate-in fade-in">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Admin Privileges Required</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            The Rubric Calibration Studio is restricted exclusively to administrators. Interviewers may grade candidates and manage the question bank.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToGrade}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
        >
          Return to Grade Interview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Admin Privilege Banner */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Admin Rubric Calibration Studio
            </h3>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              Only authorized administrators can customize rubric axes and calibrated 1–5 scoring definitions. Changes take effect immediately across the grading dashboard and candidate scorecards.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300/80 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Admin Authorized
        </span>
      </div>

      {/* Track Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Select Interview Track
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a track to inspect and calibrate its evaluation criteria
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {interviewTypes.map((type) => {
            const isSelected = rubricTrackId === type.id;
            const count = allCriteria.filter((c) => c.interview_type_id === type.id).length;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setRubricTrackId(type.id);
                  setEditingCriterionId(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{type.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Criteria List & Editor */}
      <div className="space-y-4">
        {rubricCriteria.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            No rubric criteria configured for this track yet.
          </div>
        ) : (
          rubricCriteria.map((criterion, idx) => {
            const isEditing = editingCriterionId === criterion.id;

            if (isEditing) {
              return (
                <div
                  key={criterion.id}
                  className="bg-white rounded-2xl border-2 border-blue-500 shadow-md p-6 space-y-5 transition animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Editing Axis: {criterion.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEditCriterion}
                        disabled={isSavingRubric}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCriterion}
                        disabled={isSavingRubric}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition"
                      >
                        {isSavingRubric ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Axis Name / Label *
                    </label>
                    <input
                      type="text"
                      value={editCriterionForm.label}
                      onChange={(e) =>
                        setEditCriterionForm((prev) => ({ ...prev, label: e.target.value }))
                      }
                      className="block w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="e.g. Code Quality & Modularity"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Calibrated 1–5 Level Benchmarks
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        return (
                          <div
                            key={lvl}
                            className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-700">
                                Level {lvl}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500">
                                {SCALE_LABELS[lvl]}
                              </span>
                            </div>
                            <textarea
                              rows={5}
                              value={editCriterionForm.scale_descriptions[String(lvl)] || ''}
                              onChange={(e) =>
                                setEditCriterionForm((prev) => ({
                                  ...prev,
                                  scale_descriptions: {
                                    ...prev.scale_descriptions,
                                    [String(lvl)]: e.target.value,
                                  },
                                }))
                              }
                              placeholder={`Level ${lvl} benchmark definition...`}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-white leading-relaxed"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={criterion.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{criterion.label}</h3>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {criterion.criterion_key}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEditCriterion(criterion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <PenLine className="h-3.5 w-3.5 text-blue-600" />
                    <span>Edit Verbiage</span>
                  </button>
                </div>

                {/* Level 1-5 definitions summary */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const desc = criterion.scale_descriptions?.[String(lvl)];
                    return (
                      <div
                        key={lvl}
                        className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5 shadow-2xs"
                      >
                        <span className="inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {lvl} • {SCALE_LABELS[lvl]}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {desc || <span className="italic text-slate-400">No definition set</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
