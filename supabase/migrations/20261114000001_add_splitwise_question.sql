-- Migration: Add Splitwise to LLD and AI-Enabled Coding question bank
-- Idempotent: safe to run multiple times without duplicating rows

insert into questions (interview_type_id, title)
select id, 'Splitwise' 
from interview_types 
where slug in ('lld', 'ai_coding')
on conflict (interview_type_id, title) do nothing;

