-- Migration: Reclassify 'Splitwise' question and associated evaluations to LLD Coding
-- Idempotent: safe to run multiple times without duplicate key or foreign key errors

do $$
declare
  v_lld_type_id uuid;
  v_lld_name text;
  v_ai_type_id uuid;
  v_lld_question_id uuid;
  v_ai_question_id uuid;
begin
  -- 1. Look up interview track IDs
  select id, name into v_lld_type_id, v_lld_name 
  from public.interview_types 
  where slug = 'lld';

  select id into v_ai_type_id 
  from public.interview_types 
  where slug = 'ai_coding';

  if v_lld_type_id is null then
    raise exception 'Interview type "lld" not found in interview_types table';
  end if;

  -- 2. Find existing question rows for Splitwise under LLD and AI Coding
  select id into v_lld_question_id 
  from public.questions 
  where interview_type_id = v_lld_type_id 
    and lower(trim(title)) = 'splitwise' 
  limit 1;

  select id into v_ai_question_id 
  from public.questions 
  where interview_type_id = v_ai_type_id 
    and lower(trim(title)) = 'splitwise' 
  limit 1;

  -- 3. Ensure a valid Splitwise question exists for LLD
  if v_lld_question_id is null then
    if v_ai_question_id is not null then
      -- Move the AI Coding Splitwise row to LLD
      update public.questions 
      set interview_type_id = v_lld_type_id 
      where id = v_ai_question_id;
      
      v_lld_question_id := v_ai_question_id;
      v_ai_question_id := null;
    else
      -- Neither exists, insert new LLD Splitwise question
      insert into public.questions (interview_type_id, title)
      values (v_lld_type_id, 'Splitwise')
      returning id into v_lld_question_id;
    end if;
  end if;

  -- 4. Re-point and update all evaluations that used Splitwise
  update public.evaluations
  set
    interview_type_id = v_lld_type_id,
    interview_type_name = v_lld_name,
    question_id = v_lld_question_id,
    question_title = 'Splitwise'
  where
    question_id in (v_lld_question_id, coalesce(v_ai_question_id, v_lld_question_id))
    or lower(trim(question_title)) = 'splitwise';

  -- 5. Delete the duplicate AI Coding question if one still exists
  if v_ai_question_id is not null and v_ai_question_id <> v_lld_question_id then
    delete from public.questions where id = v_ai_question_id;
  end if;

  -- 6. Clean up 'ai_fluency' rubric scores from reclassified evaluations
  -- LLD Coding rubrics only have 5 axes (Optimality, Communication, DS & Language, Complexity, Product/System).
  -- Any 'ai_fluency' score left over from AI Coding is removed so the scorecard reflects the standard LLD rubric.
  delete from public.evaluation_scores
  where evaluation_id in (
    select id from public.evaluations where question_id = v_lld_question_id
  )
  and criterion_key = 'ai_fluency';

end $$;
