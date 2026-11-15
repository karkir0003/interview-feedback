-- Migration: 20261115000002_smart_user_profile_trigger.sql
-- Description: Improve handle_new_user trigger to handle profile email collisions,
-- support role preservation, and automatically promote admin patterns.

DO $$
BEGIN
  RAISE NOTICE 'Applying smart handle_new_user trigger...';
END $$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text := 'candidate';
BEGIN
  -- Auto-promote designated admin patterns for development and trusted accounts
  IF lower(trim(new.email)) IN ('admin@mocksignal.local', 'karthik@datasciencegt.org')
     OR lower(trim(new.email)) LIKE '%+admin@%'
     OR lower(trim(new.email)) LIKE 'admin@%' THEN
    v_role := 'admin';
  ELSIF lower(trim(new.email)) = 'interviewer@mocksignal.local' THEN
    v_role := 'interviewer';
  END IF;

  -- Handle existing profile gracefully (e.g. from seed snapshot or re-signup)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = lower(trim(new.email))) THEN
    UPDATE public.profiles
    SET id = new.id,
        role = CASE 
          WHEN profiles.role IN ('admin', 'interviewer') THEN profiles.role 
          ELSE v_role 
        END
    WHERE email = lower(trim(new.email));
  ELSE
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, lower(trim(new.email)), v_role)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = CASE 
        WHEN profiles.role IN ('admin', 'interviewer') THEN profiles.role 
        ELSE EXCLUDED.role 
      END;
  END IF;

  RETURN new;
END $$;

-- Self-verifying sanity check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'handle_new_user function was not created properly';
  END IF;
  RAISE NOTICE 'SUCCESS: handle_new_user trigger updated successfully.';
END $$;

