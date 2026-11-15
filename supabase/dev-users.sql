-- Seed file: supabase/dev-users.sql
-- Pre-seeded local development accounts with password 'password123'
-- Loaded exclusively in local development during `supabase db reset`.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_interviewer_id uuid := '00000000-0000-0000-0000-000000000002';
  v_candidate_id uuid := '00000000-0000-0000-0000-000000000003';
  v_karthik_id uuid := 'd2ddd86b-7dc6-4c1a-a267-583db22a8199';
  v_pw_hash text := extensions.crypt('password123', extensions.gen_salt('bf'));
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
    (v_candidate_id, '00000000-0000-0000-0000-000000000000', 'candidate@mocksignal.local', v_pw_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"MockSignal Candidate"}'::jsonb, 'authenticated', 'authenticated', '', '', '', '', now(), now()),
    (v_karthik_id, '00000000-0000-0000-0000-000000000000', 'karthik@datasciencegt.org', v_pw_hash, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Karthik"}'::jsonb, 'authenticated', 'authenticated', '', '', '', '', now(), now())
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
  DELETE FROM auth.identities WHERE user_id IN (v_admin_id, v_interviewer_id, v_candidate_id, v_karthik_id);
  
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES
    (v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@mocksignal.local'), 'email', v_admin_id::text, now(), now(), now()),
    (v_interviewer_id, v_interviewer_id, jsonb_build_object('sub', v_interviewer_id::text, 'email', 'interviewer@mocksignal.local'), 'email', v_interviewer_id::text, now(), now(), now()),
    (v_candidate_id, v_candidate_id, jsonb_build_object('sub', v_candidate_id::text, 'email', 'candidate@mocksignal.local'), 'email', v_candidate_id::text, now(), now(), now()),
    (v_karthik_id, v_karthik_id, jsonb_build_object('sub', v_karthik_id::text, 'email', 'karthik@datasciencegt.org'), 'email', v_karthik_id::text, now(), now(), now());

  -- 3. Upsert profiles with expected roles
  INSERT INTO public.profiles (id, email, role)
  VALUES
    (v_admin_id, 'admin@mocksignal.local', 'admin'),
    (v_interviewer_id, 'interviewer@mocksignal.local', 'interviewer'),
    (v_candidate_id, 'candidate@mocksignal.local', 'candidate'),
    (v_karthik_id, 'karthik@datasciencegt.org', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  RAISE NOTICE 'SUCCESS: Seeded local dev accounts (admin, interviewer, candidate, karthik).';
END $$;
