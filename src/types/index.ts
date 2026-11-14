export type UserRole = 'admin' | 'interviewer' | 'candidate';

export type HireabilityVerdict = 'No Hire' | 'Partial Hire' | 'Hire' | 'Strong Hire';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Candidate {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface InterviewType {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface RubricCriterion {
  id: string;
  interview_type_id: string;
  criterion_key: string;
  label: string;
  scale_descriptions: Record<string, string>;
  display_order: number;
  is_active: boolean;
}

export interface Question {
  id: string;
  interview_type_id: string;
  title: string;
  is_active: boolean;
}

export interface Evaluation {
  id: string;
  public_token: string;
  candidate_id: string;
  interview_type_id: string;
  question_id?: string | null;
  interview_type_name: string;
  question_title: string;
  hireability: HireabilityVerdict;
  overall_feedback: string;
  interviewed_at: string;
  created_at: string;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criterion_key: string;
  criterion_label: string;
  score: number;
  justification: string;
  display_order: number;
}

export interface PublicScorecardScore {
  criterion_key: string;
  criterion_label: string;
  score: number;
  justification: string;
}

export interface PublicScorecard {
  id: string;
  candidate_name: string;
  interview_type_name: string;
  question_title: string;
  hireability: HireabilityVerdict;
  overall_feedback: string;
  interviewed_at: string;
  scores: PublicScorecardScore[];
}

export interface EvaluationWithScores extends Evaluation {
  evaluation_scores: EvaluationScore[];
  candidates?: Candidate;
}

export interface EvaluationFormCriterionState {
  criterion_key: string;
  criterion_label: string;
  score: number;
  justification: string;
  display_order: number;
  scale_descriptions: Record<string, string>;
}

export interface EvaluationFormData {
  candidate_name: string;
  candidate_email: string;
  interview_date: string;
  interview_type_id: string;
  question_mode: 'select' | 'new';
  selected_question_id: string;
  custom_question_title: string;
  save_question_to_bank: boolean;
  criteria: Record<string, EvaluationFormCriterionState>;
  hireability: HireabilityVerdict;
  overall_feedback: string;
}

