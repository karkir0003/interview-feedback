-- Seed file: supabase/dev-users.sql
-- Pre-seeded local development accounts with password 'password123'
-- Also pre-seeds rich sample mock interview evaluations for local testing.
-- Loaded exclusively in local development during `supabase db reset`.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_interviewer_id uuid := '00000000-0000-0000-0000-000000000002';
  v_candidate_id uuid := '00000000-0000-0000-0000-000000000003';
  v_eval_lld_id uuid := '00000000-0000-0000-0000-000000000101';
  v_eval_dsa_id uuid := '00000000-0000-0000-0000-000000000102';
  v_pw_hash text := extensions.crypt('password123', extensions.gen_salt('bf'));

  v_lld_track_id uuid;
  v_dsa_track_id uuid;
  v_splitwise_q_id uuid;
  v_lru_q_id uuid;
BEGIN
  -- 1. Create or update auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at
  ) VALUES 
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@mocksignal.local', v_pw_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MockSignal Admin"}'::jsonb, 'authenticated', 'authenticated', '', '', '', '', now(), now()),
    (v_interviewer_id, '00000000-0000-0000-0000-000000000000', 'interviewer@mocksignal.local', v_pw_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MockSignal Interviewer"}'::jsonb, 'authenticated', 'authenticated', '', '', '', '', now(), now()),
    (v_candidate_id, '00000000-0000-0000-0000-000000000000', 'candidate@mocksignal.local', v_pw_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alex Rivera"}'::jsonb, 'authenticated', 'authenticated', '', '', '', '', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    updated_at = now();

  -- 2. Create or update auth.identities for GoTrue password auth
  DELETE FROM auth.identities WHERE user_id IN (v_admin_id, v_interviewer_id, v_candidate_id);
  
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES
    (v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@mocksignal.local'), 'email', v_admin_id::text, now(), now(), now()),
    (v_interviewer_id, v_interviewer_id, jsonb_build_object('sub', v_interviewer_id::text, 'email', 'interviewer@mocksignal.local'), 'email', v_interviewer_id::text, now(), now(), now()),
    (v_candidate_id, v_candidate_id, jsonb_build_object('sub', v_candidate_id::text, 'email', 'candidate@mocksignal.local'), 'email', v_candidate_id::text, now(), now(), now());

  -- 3. Upsert profiles with expected roles
  INSERT INTO public.profiles (id, email, role)
  VALUES
    (v_admin_id, 'admin@mocksignal.local', 'admin'),
    (v_interviewer_id, 'interviewer@mocksignal.local', 'interviewer'),
    (v_candidate_id, 'candidate@mocksignal.local', 'candidate')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  -- 4. Upsert Candidate Record for candidate@mocksignal.local
  INSERT INTO public.candidates (id, email, full_name)
  VALUES (v_candidate_id, 'candidate@mocksignal.local', 'Alex Rivera')
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name;

  -- 5. Look up Track and Question references
  SELECT id INTO v_lld_track_id FROM public.interview_types WHERE slug = 'lld';
  SELECT id INTO v_dsa_track_id FROM public.interview_types WHERE slug = 'dsa';
  SELECT id INTO v_splitwise_q_id FROM public.questions WHERE title = 'Splitwise' AND interview_type_id = v_lld_track_id LIMIT 1;
  SELECT id INTO v_lru_q_id FROM public.questions WHERE title = 'LRU Cache' AND interview_type_id = v_dsa_track_id LIMIT 1;

  -- 6. Pre-seed Sample Evaluations
  -- Evaluation 1: LLD Splitwise
  INSERT INTO public.evaluations (
    id, public_token, candidate_id, interview_type_id, question_id,
    interview_type_name, question_title, hireability, overall_feedback,
    interviewed_at, created_at
  ) VALUES (
    v_eval_lld_id,
    '00000000-0000-0000-0000-000000000201',
    v_candidate_id,
    v_lld_track_id,
    v_splitwise_q_id,
    'LLD Coding',
    'Splitwise',
    'Hire',
    E'### Strengths\n- **Object-Oriented Design**: Clean domain separation between `User`, `Expense`, and `BalanceSheet` models.\n- **Extensibility**: Used the Strategy Pattern for split calculations (Equal, Exact, Percentage) effectively.\n- **Communication**: Clarified requirements and constraints upfront before jumping into code.\n\n### Growth Areas\n- Could account for penny round-off discrepancies (e.g. $10 split across 3 users) earlier during the requirements phase.',
    current_date - interval '4 days',
    now() - interval '4 days'
  ) ON CONFLICT (id) DO UPDATE SET
    hireability = EXCLUDED.hireability,
    overall_feedback = EXCLUDED.overall_feedback;

  -- Evaluation 2: DSA LRU Cache
  INSERT INTO public.evaluations (
    id, public_token, candidate_id, interview_type_id, question_id,
    interview_type_name, question_title, hireability, overall_feedback,
    interviewed_at, created_at
  ) VALUES (
    v_eval_dsa_id,
    '00000000-0000-0000-0000-000000000202',
    v_candidate_id,
    v_dsa_track_id,
    v_lru_q_id,
    'DSA / LeetCode',
    'LRU Cache',
    'Strong Hire',
    E'### Strengths\n- **Optimal Complexity**: Implemented O(1) `get` and `put` using a Doubly Linked List with a Hash Map.\n- **Sentinel Nodes**: Clean edge-case handling with dummy head and tail nodes, completely preventing null-pointer bugs.\n- **Speed & Precision**: Completed implementation and unit testing in 24 minutes.\n\n### Growth Areas\n- Discussed read/write concurrency locks only when prompted in the follow-up section; could mention concurrent access trade-offs upfront.',
    current_date - interval '10 days',
    now() - interval '10 days'
  ) ON CONFLICT (id) DO UPDATE SET
    hireability = EXCLUDED.hireability,
    overall_feedback = EXCLUDED.overall_feedback;

  -- 7. Pre-seed Rubric Scores for LLD Evaluation
  DELETE FROM public.evaluation_scores WHERE evaluation_id IN (v_eval_lld_id, v_eval_dsa_id);

  INSERT INTO public.evaluation_scores (
    evaluation_id, criterion_key, criterion_label, score, justification, display_order
  )
  SELECT 
    v_eval_lld_id,
    rc.criterion_key,
    rc.label,
    CASE rc.criterion_key
      WHEN 'optimality' THEN 4
      WHEN 'communication' THEN 5
      WHEN 'ds_language' THEN 4
      WHEN 'complexity' THEN 4
      WHEN 'product_system' THEN 4
      ELSE 4
    END,
    'Solid execution across LLD design dimensions with high code readability.',
    rc.display_order
  FROM public.rubric_criteria rc
  WHERE rc.interview_type_id = v_lld_track_id;

  -- 8. Pre-seed Rubric Scores for DSA Evaluation
  INSERT INTO public.evaluation_scores (
    evaluation_id, criterion_key, criterion_label, score, justification, display_order
  )
  SELECT 
    v_eval_dsa_id,
    rc.criterion_key,
    rc.label,
    CASE rc.criterion_key
      WHEN 'optimality' THEN 5
      WHEN 'communication' THEN 5
      WHEN 'ds_language' THEN 5
      WHEN 'complexity' THEN 4
      WHEN 'product_system' THEN 4
      ELSE 5
    END,
    'Near-flawless algorithmic implementation and complexity analysis.',
    rc.display_order
  FROM public.rubric_criteria rc
  WHERE rc.interview_type_id = v_dsa_track_id;

  RAISE NOTICE 'SUCCESS: Seeded synthetic dev users and rich sample feedback for Alex Rivera.';
END $$;
