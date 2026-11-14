import { HireabilityVerdict, UserRole } from './index';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      candidates: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      interview_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          display_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          display_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      rubric_criteria: {
        Row: {
          id: string;
          interview_type_id: string;
          criterion_key: string;
          label: string;
          scale_descriptions: Record<string, string>;
          display_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          interview_type_id: string;
          criterion_key: string;
          label: string;
          scale_descriptions: Record<string, string>;
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          interview_type_id?: string;
          criterion_key?: string;
          label?: string;
          scale_descriptions?: Record<string, string>;
          display_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          interview_type_id: string;
          title: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          interview_type_id: string;
          title: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          interview_type_id?: string;
          title?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      evaluations: {
        Row: {
          id: string;
          public_token: string;
          candidate_id: string;
          interview_type_id: string;
          question_id: string | null;
          interview_type_name: string;
          question_title: string;
          hireability: HireabilityVerdict;
          overall_feedback: string;
          interviewed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          public_token?: string;
          candidate_id: string;
          interview_type_id: string;
          question_id?: string | null;
          interview_type_name: string;
          question_title: string;
          hireability: HireabilityVerdict;
          overall_feedback: string;
          interviewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_token?: string;
          candidate_id?: string;
          interview_type_id?: string;
          question_id?: string | null;
          interview_type_name?: string;
          question_title?: string;
          hireability?: HireabilityVerdict;
          overall_feedback?: string;
          interviewed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      evaluation_scores: {
        Row: {
          id: string;
          evaluation_id: string;
          criterion_key: string;
          criterion_label: string;
          score: number;
          justification: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          evaluation_id: string;
          criterion_key: string;
          criterion_label: string;
          score: number;
          justification: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          evaluation_id?: string;
          criterion_key?: string;
          criterion_label?: string;
          score?: number;
          justification?: string;
          display_order?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_evaluation_by_token: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
