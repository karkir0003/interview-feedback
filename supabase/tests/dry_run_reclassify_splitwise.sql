-- ==============================================================================
-- MIGRATION TEST HARNESS: Dry-Run Reclassify Splitwise to LLD
-- Safe to run in Supabase SQL Editor: ALWAYS rolls back, leaving ZERO changes.
-- ==============================================================================

BEGIN;

do $$
declare
  v_lld_id uuid;
  v_ai_id uuid;
  v_test_candidate_id uuid;
  v_test_eval_id uuid;
  v_ai_question_id uuid;
  v_lld_question_id uuid;
  v_eval_count_before int;
  v_eval_count_after int;
  v_ai_question_count int;
  v_lld_question_count int;
  v_lingering_fluency_count int;
begin
  raise notice '--------------------------------------------------------------';
  raise notice 'STEP 1: Setting up environment & validating tracks...';
  raise notice '--------------------------------------------------------------';

  select id into v_lld_id from public.interview_types where slug = 'lld';
  select id into v_ai_id from public.interview_types where slug = 'ai_coding';

  if v_lld_id is null or v_ai_id is null then
    raise exception 'TEST FAILED: Required interview types (lld, ai_coding) not found.';
  end if;

  -- 1a. Ensure at least one AI Coding Splitwise evaluation exists to prove the migration works
  select id into v_ai_question_id from public.questions where interview_type_id = v_ai_id and lower(trim(title)) = 'splitwise' limit 1;
  if v_ai_question_id is null then
    insert into public.questions (interview_type_id, title) values (v_ai_id, 'Splitwise') returning id into v_ai_question_id;
  end if;

  -- Create a temporary test candidate & evaluation if no Splitwise evaluation currently exists
  insert into public.candidates (email, full_name)
  values ('dryrun_test_candidate@example.com', 'DryRun Test Candidate')
  on conflict (email) do update set full_name = excluded.full_name
  returning id into v_test_candidate_id;

  insert into public.evaluations (
    candidate_id, interview_type_id, question_id, interview_type_name, question_title, hireability, overall_feedback
  ) values (
    v_test_candidate_id, v_ai_id, v_ai_question_id, 'AI-Enabled Coding', 'Splitwise', 'Hire', 'Dry run verification test'
  ) returning id into v_test_eval_id;

  insert into public.evaluation_scores (evaluation_id, criterion_key, criterion_label, score, justification, display_order)
  values 
    (v_test_eval_id, 'optimality', 'Optimality of solution', 4, 'Solid approach', 1),
    (v_test_eval_id, 'ai_fluency', 'AI fluency', 3, 'Prompted well', 6);

  select count(*) into v_eval_count_before from public.evaluations where lower(trim(question_title)) = 'splitwise';
  raise notice 'Setup complete. Found % Splitwise evaluation(s) to test against.', v_eval_count_before;

  raise notice '--------------------------------------------------------------';
  raise notice 'STEP 2: Executing migration logic...';
  raise notice '--------------------------------------------------------------';

  -- [MIGRATION LOGIC START]
  select id into v_lld_question_id from public.questions where interview_type_id = v_lld_id and lower(trim(title)) = 'splitwise' limit 1;
  select id into v_ai_question_id from public.questions where interview_type_id = v_ai_id and lower(trim(title)) = 'splitwise' limit 1;

  if v_lld_question_id is null then
    if v_ai_question_id is not null then
      update public.questions set interview_type_id = v_lld_id where id = v_ai_question_id;
      v_lld_question_id := v_ai_question_id;
      v_ai_question_id := null;
    else
      insert into public.questions (interview_type_id, title) values (v_lld_id, 'Splitwise') returning id into v_lld_question_id;
    end if;
  end if;

  update public.evaluations
  set
    interview_type_id = v_lld_id,
    interview_type_name = (select name from public.interview_types where id = v_lld_id),
    question_id = v_lld_question_id,
    question_title = 'Splitwise'
  where
    question_id in (v_lld_question_id, coalesce(v_ai_question_id, v_lld_question_id))
    or lower(trim(question_title)) = 'splitwise';

  if v_ai_question_id is not null and v_ai_question_id <> v_lld_question_id then
    delete from public.questions where id = v_ai_question_id;
  end if;

  delete from public.evaluation_scores
  where evaluation_id in (
    select id from public.evaluations where question_id = v_lld_question_id
  )
  and criterion_key = 'ai_fluency';
  -- [MIGRATION LOGIC END]

  raise notice '--------------------------------------------------------------';
  raise notice 'STEP 3: Running automated assertions...';
  raise notice '--------------------------------------------------------------';

  -- Assertion 1: LLD Splitwise question must exist
  select count(*) into v_lld_question_count from public.questions where interview_type_id = v_lld_id and lower(trim(title)) = 'splitwise';
  if v_lld_question_count <> 1 then
    raise exception 'ASSERTION 1 FAILED: Expected exactly 1 Splitwise question in LLD, found %', v_lld_question_count;
  end if;
  raise notice '✓ Assertion 1 passed: Exactly 1 Splitwise question exists in LLD track.';

  -- Assertion 2: AI Coding Splitwise question must NOT exist
  select count(*) into v_ai_question_count from public.questions where interview_type_id = v_ai_id and lower(trim(title)) = 'splitwise';
  if v_ai_question_count <> 0 then
    raise exception 'ASSERTION 2 FAILED: Expected 0 Splitwise questions in AI Coding, found %', v_ai_question_count;
  end if;
  raise notice '✓ Assertion 2 passed: 0 Splitwise questions exist in AI Coding track.';

  -- Assertion 3: All Splitwise evaluations must be in LLD track
  select count(*) into v_eval_count_after from public.evaluations where lower(trim(question_title)) = 'splitwise' and interview_type_id = v_lld_id;
  if v_eval_count_after <> v_eval_count_before then
    raise exception 'ASSERTION 3 FAILED: Expected % evaluations migrated to LLD, but found %', v_eval_count_before, v_eval_count_after;
  end if;
  raise notice '✓ Assertion 3 passed: All % Splitwise evaluations are assigned to LLD.', v_eval_count_after;

  -- Assertion 4: No ai_fluency scores remain on Splitwise evaluations
  select count(*) into v_lingering_fluency_count
  from public.evaluation_scores es
  join public.evaluations e on e.id = es.evaluation_id
  where lower(trim(e.question_title)) = 'splitwise' and es.criterion_key = 'ai_fluency';
  if v_lingering_fluency_count <> 0 then
    raise exception 'ASSERTION 4 FAILED: Lingering ai_fluency score found on % evaluation(s)', v_lingering_fluency_count;
  end if;
  raise notice '✓ Assertion 4 passed: Zero lingering ai_fluency rubric scores.';

  raise notice '==============================================================';
  raise notice 'DRY RUN RESULT: ALL ASSERTIONS PASSED!';
  raise notice 'The migration logic is 100%% verified and safe to apply.';
  raise notice 'Now rolling back all changes so no data is altered.';
  raise notice '==============================================================';

end $$;

-- ALWAYS ROLLBACK TO PRESERVE PRODUCTION STATE
ROLLBACK;

